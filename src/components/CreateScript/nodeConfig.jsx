import React, { useState } from 'react';
import { List, Modal, Form, Button, Input, InputNumber } from 'antd';
import { AvaxLogo, PolygonLogo, BSCLogo, ETHLogo } from "./Logos";

export default function NodeConfig() {
    var nodeConfigInfoInLocal = global.localStorage.getItem('nodeConfig');
    if (nodeConfigInfoInLocal == null) {
        nodeConfigInfoInLocal = [
            // {
            //     'chainName': 'Ethereum',
            //     'chainId': 1, 
            //     'https': 'https://mainnet.infura.io/v3/a8552117699ffa5bd', 
            //     'wss': 'wss://mainnet.infura.io/ws/v3/a8552117699ffa5bd'
            // },
            // {
            //     'chainName': 'Arbitrum',
            //     'chainId': 42161, 
            //     'https': 'https://arb1.arbitrum.io/rpc', 
            //     'wss': 'wss://arb1.arbitrum.io/rpc'
            // },
            // {
            //     'chainName': 'Optimism',
            //     'chainId': 10, 
            //     'https': 'https://mainnet.optimism.io', 
            //     'wss': 'wss://mainnet.optimism.io'
            // }
        ]
    }

    const [nodeConfigInfo, setNodeConfigInfo] = useState(JSON.parse(nodeConfigInfoInLocal));
    const [configVisible, setConfigVisible] = useState(false);
    const [modifyConfigVisible, setModifyConfigVisible] = useState(false);
    const [initValue, setInitValue] = useState(null);

    const [addForm] = Form.useForm();
    const [modifyForm] = Form.useForm();

    const logoMap = {1: <ETHLogo />, 43113: <AvaxLogo />, 137: <PolygonLogo />, 56: <BSCLogo />}

    const checkChainId = (_, value) => {
        const index = nodeConfigInfo.findIndex((item) => item.chainId === value);
        if (index === -1) {
          return Promise.resolve();
        }
    
        return Promise.reject(new Error('Chain Id exist!'));
      };

    const deleteNodeInfo = (chainId) => {
        const configInfo = nodeConfigInfo.filter(item => item.chainId !== chainId);
        setNodeConfigInfo(configInfo);
        global.localStorage.setItem('nodeConfig', JSON.stringify(configInfo));
    }

    const modifyNodeInfo = (chainId) => {
        const configInfo = nodeConfigInfo.filter(item => item.chainId === chainId);
        setInitValue(configInfo[0]);
        modifyForm.setFieldsValue(configInfo[0]);
        setModifyConfigVisible(true);
    }

    return (
        <div>
            <List
            header={<div>Node Config Information</div>}
            footer={<Button type="primary" onClick={() => {setConfigVisible(true);}}>Add RPC Node</Button>}
            bordered
            dataSource={nodeConfigInfo}
            renderItem={item => (
                <List.Item>
                    <List.Item.Meta
                        avatar={logoMap[item.chainId] ? logoMap[item.chainId] : logoMap[1]}
                        title={item.chainName}
                        description={<div>chainId = {item.chainId}<p/>https rpc: {item.https}<p/>wss rpc: {item.wss}</div>}
                        />
                    <div>
                        <Button type="primary" onClick={() => deleteNodeInfo(item.chainId)}>Delete</Button>
                        <p/>
                        <Button type="primary" onClick={() => modifyNodeInfo(item.chainId)}>Modify</Button>
                    </div>
                </List.Item>
            )}
            />
            <Modal
                visible={configVisible}
                title="Add Config Node"
                okText="Confirm"
                cancelText="Cancel"
                onCancel={() => {
                    addForm.resetFields();
                        setConfigVisible(false);
                    }
                }
                onOk={() => {
                    addForm
                    .validateFields()
                    .then(values => {
                        addForm.resetFields();
                        setNodeConfigInfo([...nodeConfigInfo, values]);
                        global.localStorage.setItem('nodeConfig', JSON.stringify([...nodeConfigInfo, values]));                        
                        setConfigVisible(false);
                    })
                    .catch(info => {
                        console.log('Validate Failed:', info);
                    });
                }}
                >
                    <Form
                        form={addForm}
                        layout="vertical"
                        name="form_in_modal"
                    >
                        <Form.Item
                            name="chainName"
                            label="Chain Name"
                            rules={[{ required: true, message: 'Please input the chain name!' }]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item 
                            name="chainId" 
                            label="Chain Id"
                            rules={[{ required: true, message: 'Please input the chain id!' }, {validator: checkChainId}]}
                        >                            
                            <InputNumber min={1}/>
                        </Form.Item>

                        <Form.Item name="https" label="https url">
                            <Input type="textarea" />
                        </Form.Item>

                        <Form.Item name="wss" label="wss url">
                            <Input type="textarea" />
                        </Form.Item>
                    </Form>
                </Modal>

            <Modal
            visible={modifyConfigVisible}
            title="Modify Config Node"
            okText="Confirm"
            cancelText="Cancel"
            onCancel={() => {
                    modifyForm.resetFields();
                    setModifyConfigVisible(false);
                }
            }
            onOk={() => {
                modifyForm
                .validateFields()
                .then(values => {
                    modifyForm.resetFields();
                    const configInfos = nodeConfigInfo.map(item => {
                        if (item.chainId === initValue.chainId) {
                            values.chainId = initValue.chainId;
                            return values;
                        }
                        return item;
                    })
                    setNodeConfigInfo(configInfos);
                    global.localStorage.setItem('nodeConfig', JSON.stringify(configInfos));
                    setModifyConfigVisible(false);
                })
                .catch(info => {
                    console.log('Validate Failed:', info);
                });
            }}
            >
                <Form
                    form={modifyForm}
                    layout="vertical"
                    name="form_in_modal"
                    initialValues={ initValue }
                >
                    <Form.Item
                        name="chainName"
                        label="Chain Name"
                    >
                        <Input type="textarea"/>
                    </Form.Item>

                    <Form.Item name="https" label="https url">
                        <Input type="textarea" />
                    </Form.Item>

                    <Form.Item name="wss" label="wss url">
                        <Input type="textarea" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
        ); 
}