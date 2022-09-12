import React, { useState } from 'react';
import { Collapse, Typography, Space, Form, Button, Input, Modal, Select, Tooltip, InputNumber } from 'antd';
import { PlusCircleOutlined, SyncOutlined, EditOutlined, ExclamationCircleOutlined, CheckCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import Web3 from 'web3';
import * as utils from '../../../utils/utils';
import * as constant from './constant';
import assert from 'assert';


const { Option } = Select;


export default function Event() {
    var evmChainIds = constant.evmChainIds;
    var localEvmChainInfo = global.localStorage.getItem('evmChainInfo');
    if (localEvmChainInfo != null) {
        evmChainIds = JSON.parse(localEvmChainInfo);
    }
    var contractABI = global.localStorage.getItem('contractABIInfo');
    if (contractABI != null) {
        contractABI = JSON.parse(contractABI);
    } else {
        contractABI = {};
    }

    const [web3, setWeb3] = useState(new Web3());
    const [evmChainInfo, setEvmChainInfo] = useState(evmChainIds);
    const [contractABIInfo, setContractABIInfo] = useState(contractABI);
    const [script, setScript] = useState({});
    const [addEventMonitorVisible, setAddEventMonitorVisible] = useState(false);
    const [newChainVisible, setNewChainVisible] = useState(false);
    const [importABIVisible, setImportABIVisible] = useState(false);

    const [eventMonitorForm] = Form.useForm();
    const [addNewChainForm] = Form.useForm();
    
    var importedABI = '';

    const eventContractAddr = Form.useWatch('contractAddr', eventMonitorForm);
    const eventChain = Form.useWatch('chain', eventMonitorForm);


    const handleEventMonitorOk = () => {
        eventMonitorForm.validateFields()
            .then(values => {
                console.log(values);
                const eventInfo = values.event.split(',');
                assert(eventInfo.length == 2);                
                const key = values.chain + '_' + values.contractAddr + '_' + eventInfo[1] + '_' + new Date().getTime();
                const event = {
                    type: 'event', 
                    title: values.title,
                    chainId: values.chain, 
                    name: eventInfo[0], 
                    to: values.contractAddr,
                    signature: eventInfo[1],
                    filter: values.filter,
                    result: []
                }
                console.log(event);
                script[key] = event;
            })
            .catch(info => {
                setAddEventMonitorVisible(false);
                eventMonitorForm.resetFields();
                console.log('Validate Failed:', info);
            });
    }

    const addNewChain = () => {
        setNewChainVisible(true);
    }

    const syncABI = () => {
        if (constant.browserScan[eventChain] == null) {
            Modal.warning({title: 'Warning', content: 'No web service to get the ABI on this chain, please manually input the ABI'});
            return;
        }
        const getValidABIUrl = constant.getABIUrl.replace('{scanUrl}', constant.browserScan[eventChain].webUrl)
                                        .replace('{apiKey}', constant.browserScan[eventChain].apiKey)
                                        .replace('{contractAddr}', eventContractAddr);
        fetch(getValidABIUrl, {}).then(resp => {
            resp.json().then(abiInfo => {
              if (abiInfo.status === '1') {
                const contractAbi = JSON.parse(abiInfo.result);
                updateABIInfo(eventChain, eventContractAddr, contractAbi);
              } else {
                Modal.warning({title: 'Warning', content: 'Can NOT get ABI info from web service'})
              }
            });
          })
    }

    const updateABIInfo = (chain, contract, abiInfo) => {
        if (contractABI[chain] == null) {
            contractABI[chain] = {};
        }
        contractABI[chain][contract] = abiInfo;
        localStorage.setItem('contractABIInfo', JSON.stringify(contractABI));
        setContractABIInfo(contractABI);
    }

    const importABIManually = () => {
        setImportABIVisible(true);
    }

    const isABIOK = (chain, contract) => {
        return chain != null && contractABIInfo[chain] != null && contractABIInfo[chain][contract] != null;
    }

    const handleAddNewChainOk = () => {
        addNewChainForm.validateFields()
            .then(values => {
                const tmpEvmChainInfo = JSON.parse(JSON.stringify(evmChainInfo));
                tmpEvmChainInfo[values.chainId] = values.chainName;
                setEvmChainInfo(tmpEvmChainInfo); 
                setNewChainVisible(false);
                addNewChainForm.resetFields();
                global.localStorage.setItem('evmChainInfo', JSON.stringify(tmpEvmChainInfo)); 
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    }

    const handleImportABIOK = () => {
        updateABIInfo(eventChain, eventContractAddr, JSON.parse(importedABI));
        setImportABIVisible(false);
    }

    const checkChainId = (_, value) => {
        if (evmChainInfo[value] == null) {
          return Promise.resolve();
        }
    
        return Promise.reject(new Error('Chain has been exist!'));
    }

    const checkFilter = (_, value) => {
        try {
            const filter = JSON.parse(value);
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(new Error('Invalid filter content:' + error.message));
        }
    }

    return (
        <div>
            <Modal
                visible={addEventMonitorVisible}
                title="Monitor Event"
                okText="Confirm"
                cancelText="Cancel"
                onCancel={() => setAddEventMonitorVisible(false)}
                onOk={handleEventMonitorOk}
                footer={[
                    <Button key="back" onClick={() => setAddEventMonitorVisible(false)}>
                      Cancel
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleEventMonitorOk}>
                      Confirm
                    </Button>
                  ]}
                >
                <Form
                    form={eventMonitorForm}
                    layout="vertical"
                    name="form_in_modal"
                >      
                    <Form.Item 
                        name="title" 
                        label="title"
                        rules={[{ required: true, message: 'Please input the title of this event!' }]}
                    >                            
                        <Input type='textarea' />
                    </Form.Item>
                    <Form.Item label="chain" required={true}>     
                        <Space>      
                            <Form.Item noStyle name="chain" rules={[{ required: true, message: 'Please select the chain!' }]}>                                
                                <Select showSearch style={{ width: 450}}>
                                    {
                                        Object.entries(evmChainInfo).map(entry => {
                                            return <Option key={entry[0]}>{entry[1]}(chainId={entry[0]})</Option>
                                        })
                                    }
                                </Select>
                            </Form.Item>     
                            <Tooltip title="Add new chain information">
                                <PlusCircleOutlined onClick={addNewChain}/>
                            </Tooltip>
                        </Space>
                    </Form.Item>
                    
                    <Form.Item label="Contract Address" required={true}>     
                        <Space>      
                            <Form.Item noStyle name="contractAddr" rules={[{ required: true, message: 'Please input the address of contract!' }]}>                                
                                <Input style={{ width: 400}} type="textarea" />
                            </Form.Item>  
                            {
                                utils.isEmptyObj(eventContractAddr) ?  
                                null 
                                    :
                                isABIOK(eventChain, eventContractAddr) ?
                                <Tooltip title="The ABI of contract has been in local.">
                                    <CheckCircleOutlined />
                                </Tooltip>    
                                :
                                <Tooltip title="The ABI of contract has NOT been in local.">
                                    <ExclamationCircleOutlined />
                                </Tooltip>
                            }  
                            <Tooltip title="Sync ABI from blockchain browser, such as etherscan">
                                <SyncOutlined onClick={syncABI}/>
                            </Tooltip>    
                            <Tooltip title="Import ABI manually">
                                <EditOutlined onClick={importABIManually}/>
                            </Tooltip>
                        </Space>
                    </Form.Item>
                    
                    <Form.Item
                        name="event"
                        label="event"
                        rules={[{ required: true, message: 'Please select the event to be monitored!' }]}
                    >
                        <Select showSearch style={{ width: 470}}>
                            {   
                                isABIOK(eventChain, eventContractAddr) ? 
                                    contractABIInfo[eventChain][eventContractAddr].map(element => {
                                        if (element.type == 'event') {
                                            var parameters = '';
                                            element.inputs.map(input => {
                                                parameters += input.internalType + ' ' + input.name + ', ';
                                            })
                                            if (parameters.length > 0) parameters = parameters.substr(0, parameters.length - 2);
                                            const eventSig = web3.eth.abi.encodeEventSignature(element);
                                            return <Option key={element.name + ',' + eventSig}>{element.name}({parameters})</Option>
                                        }
                                    }) : null
                            }
                        </Select>
                    </Form.Item>   

                    <Form.Item 
                        label="filter"
                    >   
                        <Space>
                            <Form.Item noStyle name="filter" rules={[{ validator: checkFilter }]}>                   
                                <Input style={{ width: 440}} type='textarea' placeholder='eg: {"param1": [1,2], "param2": "0x123456789...\"}'/>  
                            </Form.Item>  
                            <Tooltip title="Click it to get detail information about how to set filter.">
                                <a target="_blank" href="https://web3js.readthedocs.io/en/v1.7.5/web3-eth-contract.html#contract-events"><QuestionCircleOutlined /></a>
                            </Tooltip> 
                        </Space>
                    </Form.Item>
                    
                </Form>
            </Modal>

            <Modal
                visible={newChainVisible}
                title={"Add new chain"}
                okText="Confirm"
                cancelText="Cancel"
                onCancel={() => setNewChainVisible(false)}
                onOk={handleAddNewChainOk}
                footer={[
                    <Button key="back" onClick={() => setNewChainVisible(false)}>
                      Cancel
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleAddNewChainOk}>
                      Confirm
                    </Button>
                  ]}
                >
                    <Form
                        form={addNewChainForm}
                        layout="vertical"
                        name="form_in_modal"
                    >
                        <Form.Item 
                            name="chainName" 
                            label="chainName"
                            rules={[{ required: true, message: 'Please input the name of new chain!' }]}
                        >                            
                            <Input />
                        </Form.Item>

                        <Form.Item 
                            name="chainId" 
                            label="chainId"
                            rules={[{ required: true, message: 'Please input the chainId of new chain!' }, {validator: checkChainId}]}
                        >                            
                            <InputNumber min={1}/>
                        </Form.Item>
                    </Form>
                </Modal>

            <Modal
                visible={importABIVisible}
                title={"Import ABI"}
                okText="Confirm"
                cancelText="Cancel"
                onCancel={() => setImportABIVisible(false)}
                onOk={handleImportABIOK}
                footer={[
                    <Button key="back" onClick={() => setImportABIVisible(false)}>
                      Cancel
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleImportABIOK}>
                      Confirm
                    </Button>
                  ]}
                >
                <Input.TextArea defaultValue='' allowClear placeholder='[....]' rows={6} onChange={e => importedABI = e.target.value}/>    
            </Modal>
        </div>
        ); 
}