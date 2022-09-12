import React, { useState } from 'react';
import { List, Modal, Form, Button, Input } from 'antd';
import { ethers } from 'ethers';
// import * as ethUtil from 'ethereumjs-util';
import { AvaxLogo, PolygonLogo, BSCLogo, ETHLogo } from "./Logos";
//import * as utils from '../../utils/utils'; 

export default function Wallet() {
    var localAccountList = global.localStorage.getItem('accountList');
    if (localAccountList == null) {
        localAccountList = []
    }

    const [accountList, setAccountList] = useState(localAccountList.length > 0 ? JSON.parse(localAccountList) : []);
    const [importKeyVisible, setImportKeyVisible] = useState(false);
    const [keyLoading, setKeyLoading] = useState(false);
    const [exportKeyVisible, setExportKeyVisible] = useState(false);
    const [exportedAddress, setExportedAddress] = useState('');

    const [importForm] = Form.useForm();
    const [exportForm] = Form.useForm();

    const logoMap = {1: <ETHLogo />, 43113: <AvaxLogo />, 137: <PolygonLogo />, 56: <BSCLogo />}

    const importAccountByKey = () => {
        setImportKeyVisible(true);
    }

    const deleteAccount = (address) => {
        const newAccountList = accountList.filter((item) => item.address !== address);
        setAccountList(newAccountList);
        global.localStorage.setItem('accountList', JSON.stringify([...newAccountList])); 
    }

    const exportPrivateKey = (address) => {
        setExportedAddress(address);
        setExportKeyVisible(true);
    }

    const handleExportCancel = () => {
        exportForm.resetFields();
        setExportKeyVisible(false);
    }

    const handleExportOk = (values) => {
        exportForm.validateFields()
            .then(values => {
                const accountInfo = accountList.filter((item) => item.address === exportedAddress);
                setKeyLoading(true);
                ethers.Wallet.fromEncryptedJson(JSON.stringify(accountInfo[0]), values.password)
                        .then(wallet => {
                            setKeyLoading(false);
                            setExportKeyVisible(false);
                            exportForm.resetFields();
                            Modal.success({title: 'Private Key', content: wallet.privateKey});
                        })
                        .catch (resp => { 
                            setKeyLoading(false);
                            Modal.error({title: 'Error Message', content: resp.message});
                        });
            })
            .catch(info => {
                setKeyLoading(false);
                exportForm.resetFields();
                console.log('Validate Failed:', info);
            });
    }

    const importPrivateKey = (values) => {
        setKeyLoading(true);
        if (accountList.length > 0) {
            // firstly check password
            const keystore = accountList[0];
            ethers.Wallet.fromEncryptedJson(JSON.stringify(keystore), values.password)
                 .then(wallet => {
                    const newWallet = new ethers.Wallet(values.privateKey);
                    //this.encryptWallet(wallet, password, T('导入成功'));
                    newWallet.encrypt(values.password, null).then((ksInfoStr) => {
                        const ksInfoObj = JSON.parse(ksInfoStr);
                        console.log(ksInfoObj);
                        ksInfoObj.alias = values.alias;
                        for (var i = 0; i < accountList.length; i++) {
                            if (accountList[i].address == ksInfoObj.address) {
                                Modal.error({title: 'Error Message', content: 'Dupulicated address: 0x' + ksInfoObj.address});
                                setKeyLoading(false);
                                return;
                            }
                        }
                        setAccountList([...accountList, ksInfoObj]);

                        global.localStorage.setItem('accountList', JSON.stringify([...accountList, ksInfoObj]));                   
                        setImportKeyVisible(false); 
                        setKeyLoading(false);
                        importForm.resetFields();
                      }).catch(error => {
                        Modal.error({
                            title: 'error message',
                            content: error.message
                        });
                        console.log(error.message);
                        setKeyLoading(false);
                      });
                 })
                 .catch (resp => { 
                    Modal.error({
                        title: 'error message',
                        content: 'Password is wrong, please enter the same password as before'
                    });
                    console.log(resp.message);
                    setKeyLoading(false);
                  });
        } else {
            const newWallet = new ethers.Wallet(values.privateKey);
            //this.encryptWallet(wallet, password, T('导入成功'));
            newWallet.encrypt(values.password, null).then((ksInfoStr) => {
                const ksInfoObj = JSON.parse(ksInfoStr);
                console.log(ksInfoObj);
                ksInfoObj.alias = values.alias;
                
                setAccountList([...accountList, ksInfoObj]);

                global.localStorage.setItem('accountList', JSON.stringify([...accountList, ksInfoObj]));                   
                setImportKeyVisible(false); 
                setKeyLoading(false);
                importForm.resetFields();
            }).catch(error => {    
                Modal.error({
                    title: 'error message',
                    content: error.message
                });         
                console.log(error.message);
                setKeyLoading(false);
            });
        }
    }

    const handleOk = () => {
        importForm.validateFields()
            .then(values => {
                importPrivateKey(values);    
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
      };
    
    const handleCancel = () => {
        importForm.resetFields();
        setImportKeyVisible(false);
    };

    const checkAlias = (_, value) => {
        const index = accountList.findIndex((item) => item.alias === value);
        if (index === -1) {
          return Promise.resolve();
        }
    
        return Promise.reject(new Error('Alias has been exist!'));
    }

    return (
        <div>
            <List
            header={<div>Accounts Information</div>}
            footer={<Button type="primary" onClick={() => {importAccountByKey();}}>Import Account By Private Key</Button>}
            bordered
            dataSource={accountList}
            renderItem={item => (
                <List.Item>
                    <List.Item.Meta
                        avatar={logoMap[item.chainId] ? logoMap[item.chainId] : logoMap[1]}
                        title={item.alias}
                        description={<div>address: 0x{item.address}</div>}
                        />
                    <div>
                        <Button type="primary" onClick={() => deleteAccount(item.address)}>Delete</Button>
                        <p/>
                        <Button type="primary" onClick={() => exportPrivateKey(item.address)}>Export Private Key</Button>
                    </div>
                </List.Item>
            )}
            />
            <Modal
                visible={importKeyVisible}
                title="Import Account"
                okText="Confirm"
                cancelText="Cancel"
                onCancel={handleCancel}
                onOk={handleOk}
                footer={[
                    <Button key="back" onClick={handleCancel}>
                      Cancel
                    </Button>,
                    <Button key="submit" type="primary" loading={keyLoading} onClick={handleOk}>
                      Confirm
                    </Button>
                  ]}
                >
                    <Form
                        form={importForm}
                        layout="vertical"
                        name="form_in_modal"
                    >
                        <Form.Item name="alias" label="Alias" rules={[{ required: true, message: 'Please input the alias of account!' }, {validator: checkAlias}]}>
                            <Input type="textarea" />
                        </Form.Item>

                        <Form.Item
                            name="privateKey"
                            label="Private Key"
                            rules={[{ required: true, message: 'Please input the private key which will be encrypted and stored in local!' }]}
                        >
                            <Input.Password />
                        </Form.Item>

                        <Form.Item 
                            name="password" 
                            label="Password"
                            rules={[{ required: true, message: 'Please input the password to encrypt the private key!' }]}
                        >                            
                            <Input.Password />
                        </Form.Item>
                    </Form>
                </Modal>

            <Modal
                visible={exportKeyVisible}
                title={"Export Private Key of 0x" + exportedAddress}
                okText="Confirm"
                cancelText="Cancel"
                onCancel={handleExportCancel}
                onOk={handleExportOk}
                footer={[
                    <Button key="back" onClick={handleExportCancel}>
                      Cancel
                    </Button>,
                    <Button key="submit" type="primary" loading={keyLoading} onClick={handleExportOk}>
                      Confirm
                    </Button>
                  ]}
                >
                    <Form
                        form={exportForm}
                        layout="vertical"
                        name="form_in_modal"
                    >
                        <Form.Item 
                            name="password" 
                            label="Password"
                            rules={[{ required: true, message: 'Please input the password to decrypt the private key!' }]}
                        >                            
                            <Input.Password />
                        </Form.Item>
                    </Form>
                </Modal>
        </div>
        ); 
}