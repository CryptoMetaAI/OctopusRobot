import React, { useState } from 'react';
import { List, Modal, Form, Button, Input } from 'antd';
import { Link } from "react-router-dom";
import { ethers } from 'ethers';
// import * as ethUtil from 'ethereumjs-util';
import { AvaxLogo, PolygonLogo, BSCLogo, ETHLogo } from "./Logos";

export default function ScriptList() {
    var localAccountList = global.localStorage.getItem('scriptList');
    if (localAccountList == null) {
        localAccountList = []
    }
    var scripts = global.localStorage.getItem('scripts');
    if (scripts == null) {
        scripts = {}
    } else {
        scripts = JSON.parse(scripts);
    }
    var tmpList = Object.entries(scripts).map(entry => entry[1]);
    console.log(tmpList);
    tmpList = tmpList.sort((a, b) => b.createdTime - a.createdTime)
    const [scriptList, setScriptList] = useState(tmpList);
    console.log(scriptList);
    const [addScriptVisible, setAddScriptVisible] = useState(false);
    const [keyLoading, setKeyLoading] = useState(false);
    const [exportKeyVisible, setExportKeyVisible] = useState(false);
    const [exportedAddress, setExportedAddress] = useState('');

    const [importForm] = Form.useForm();
    const [exportForm] = Form.useForm();

    const logoMap = {1: <ETHLogo />, 43113: <AvaxLogo />, 137: <PolygonLogo />, 56: <BSCLogo />}

    const addScript = () => {
        setAddScriptVisible(true);
    }

    const deleteScript = (title) => {
        const newScriptList = scriptList.filter((item) => item.title !== title);
        setScriptList(newScriptList);
        delete scripts[title];
        global.localStorage.setItem('scriptList', JSON.stringify(scripts)); 
    }

    const modifyScript = (title) => {        
        global.localStorage.setItem('tmpScript', JSON.stringify(scripts[title])); 
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
                const accountInfo = scriptList.filter((item) => item.address === exportedAddress);
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
        if (scriptList.length > 0) {
            // firstly check password
            const keystore = scriptList[0];
            ethers.Wallet.fromEncryptedJson(JSON.stringify(keystore), values.password)
                 .then(wallet => {
                    const newWallet = new ethers.Wallet(values.privateKey);
                    //this.encryptWallet(wallet, password, T('导入成功'));
                    newWallet.encrypt(values.password, null).then((ksInfoStr) => {
                        const ksInfoObj = JSON.parse(ksInfoStr);
                        console.log(ksInfoObj);
                        ksInfoObj.alias = values.alias;
                        for (var i = 0; i < scriptList.length; i++) {
                            if (scriptList[i].address == ksInfoObj.address) {
                                Modal.error({title: 'Error Message', content: 'Dupulicated address: 0x' + ksInfoObj.address});
                                setKeyLoading(false);
                                return;
                            }
                        }
                        setScriptList([...scriptList, ksInfoObj]);

                        global.localStorage.setItem('scriptList', JSON.stringify([...scriptList, ksInfoObj]));                   
                        setAddScriptVisible(false); 
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
                
                setScriptList([...scriptList, ksInfoObj]);

                global.localStorage.setItem('scriptList', JSON.stringify([...scriptList, ksInfoObj]));                   
                setAddScriptVisible(false); 
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
        setAddScriptVisible(false);
    };

    const checkAlias = (_, value) => {
        const index = scriptList.findIndex((item) => item.alias === value);
        if (index === -1) {
          return Promise.resolve();
        }
    
        return Promise.reject(new Error('Alias has been exist!'));
    }

    return (
        <div>
            <List
            header={<div>Your Scripts</div>}
            footer={<Link type="primary" to="/CreateScript/addScript"><Button type='primary'>Add Script</Button></Link>}
            bordered
            dataSource={scriptList}
            renderItem={item => (
                <List.Item>
                    <List.Item.Meta
                        avatar={logoMap[item.chainId] ? logoMap[item.chainId] : logoMap[1]}
                        title={item.title}
                        description={<div>created time: {new Date(item.createdTime).toLocaleString()}</div>}
                        />
                    <div>
                        <Button type="primary" onClick={() => deleteScript(item.title)}>Delete</Button>
                        <p/>
                        <Link type="primary" to="/CreateScript/modifyScript"><Button type="primary" onClick={() => modifyScript(item.title)}>Modify</Button></Link>
                    </div>
                </List.Item>
            )}
            />
            <Modal
                visible={addScriptVisible}
                title="Add Script"
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