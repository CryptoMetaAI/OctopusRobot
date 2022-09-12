import React, { memo, useState, useEffect } from 'react';
import { Collapse, Typography, Space, Form, Button, Input, Modal, Select, Tooltip, InputNumber, Card, Divider, DatePicker } from 'antd';
import { PlusCircleOutlined, SyncOutlined, EditOutlined, ExclamationCircleOutlined, CheckCircleOutlined, QuestionCircleOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { ethers } from 'ethers';
import { Link } from "react-router-dom";
import moment from "moment";
import Web3 from 'web3';
import * as utils from '../../utils/utils';

import { AvaxLogo, PolygonLogo, BSCLogo, ETHLogo } from "./Logos";
import assert from 'assert';


//import * as utils from '../../utils/utils'; 
const { Panel } = Collapse;
const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

var evmChainIds = {
    1: "ethereum",
    3: "ropsten",
    4: "rinkeby",
    10: "optimism",
    56: "bsc",
    66: "okexchain",
    97: "bsc testnet",
    128: "heco",
    137: "polygon",
    250: "fantom",
    321: "kucoin",
    1284: "moonbeam",
    2020: "ronin",
    42161: "arbitrum",
    42170: "arb-nova",
    42220: "celo",
    42262: "oasis",
    43114: "avalanche",
    80001: "ploygon mumbai",
    1313161554: "aurora",
    1666600000: "harmony",
};

const BroswerScan = {
    1: {'webUrl': 'https://api.etherscan.io', 'apiKey': 'RQ1U2VU9D1HJ2XWPV8IRS373MKNRAXYIW4'},
    56: {'webUrl': 'https://api.bscscan.com', 'apiKey': 'H2IWZB1394DTNP1RF2C18M7XYPU8WC55FC'},
    137: {'webUrl': 'https://api.polygonscan.com', 'apiKey': 'TP3C9EXNAKNIM82G612I4WIFRG8M6V6I8Y'}
}
const getABIUrl = '{scanUrl}/api?module=contract&action=getabi&apikey={apiKey}&address={contractAddr}';

const ScriptType = {'Event':1}

// https://codepen.io/cristobalchao/pen/JqOpEZ
export default function AddScript() {
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
    var localAccountList = global.localStorage.getItem('accountList');
    if (localAccountList == null) {
        localAccountList = []
    }
    var mmAccountList = global.localStorage.getItem('metamaskAccountList');
    if (mmAccountList == null) {
        mmAccountList = []
    }
    var tmpScript = global.localStorage.getItem('tmpScript');
    if (tmpScript == null) {
        tmpScript = {}
    } else {
        tmpScript = JSON.parse(tmpScript);
    }
    var scripts = global.localStorage.getItem('scripts');
    if (scripts == null) {
        scripts = {}
    } else {
        scripts = JSON.parse(scripts);
    }

    const [accountList, setAccountList] = useState(localAccountList.length > 0 ? JSON.parse(localAccountList) : []);
    const [mmAccounts, setMMAccounts] = useState(mmAccountList.length > 0 ? JSON.parse(mmAccountList) : []);
    const [web3, setWeb3] = useState(new Web3());
    const [evmChainInfo, setEvmChainInfo] = useState(evmChainIds);
    const [contractABIInfo, setContractABIInfo] = useState(contractABI);
    const [script, setScript] = useState(tmpScript);
    const [keyLoading, setKeyLoading] = useState(false);
    const [configChainContractVisible, setConfigChainContractVisible] = useState(false);
    const [chainContractConfig, setChainContractConfig] = useState({});
    const [functionSelectedConfig, setFunctionSelectedConfig] = useState({});
    const [modalTitle, setModalTitle] = useState('');
    const [currentScriptType, setCurrentScriptType] = useState('');
    const [addEventMonitorVisible, setAddEventMonitorVisible] = useState(false);
    const [addPendingTxMonitorVisible, setAddPendingTxMonitorVisible] = useState(false);
    const [selectFunctionInContractVisible, setSelectFunctionInContractVisible] = useState(false);
    const [newChainVisible, setNewChainVisible] = useState(false);
    const [importABIVisible, setImportABIVisible] = useState(false);
    const [leftConfigVisible, setLeftConfigVisible] = useState(false);
    const [dependencyConfigVisible, setDependencyConfigVisible] = useState(false);
    const [curStep, SetCurStep] = useState(0);
    const [totalStep, SetTotalStep] = useState(0);
    const [dependencyLength, setDependencyLength] = useState(0);
    const [initialValuesOfOne, setInitialValuesOfOne] = useState({});
    const [modifyScript, setModifyScript] = useState(false);
    const [curModifiedTitle, setCurModifiedTitle] = useState('');
    const [curScriptTitle, setCurScriptTitle] = useState(script.title);
    
    const logoMap = {1: <ETHLogo />, 43113: <AvaxLogo />, 137: <PolygonLogo />, 56: <BSCLogo />}

    const [chainContractForm] = Form.useForm();
    const [eventMonitorForm] = Form.useForm();
    const [pendingTxMonitorForm] = Form.useForm();
    const [addNewChainForm] = Form.useForm();
    const [functionSelectedForm] = Form.useForm();
    const [dependencyConfigForm] = Form.useForm();
    const [leftConfigForm] = Form.useForm();

    var importedABI = '';

    const contractAddr = Form.useWatch('contractAddr', chainContractForm);
    const currentChain = Form.useWatch('chain', chainContractForm);
    const fromValueType = Form.useWatch(['from', 'valueType'], chainContractForm);
    const fromStep = Form.useWatch(['from', 'step'], chainContractForm);

    const pendingTxFunction = Form.useWatch('function', pendingTxMonitorForm);
    const readDataFunction = Form.useWatch('function', functionSelectedForm);
    const repeaTimes = Form.useWatch('repeaTimes', leftConfigForm);

    useEffect(() => chainContractForm.resetFields(), [initialValuesOfOne]);

    useEffect(() => {
        return function () {
            if (JSON.stringify(script) == '{}') {
                console.log('no content in this script');
                return;
            }
            if (utils.isEmptyObj(script.title)) {
                if (!utils.isEmptyObj(curScriptTitle)) {
                    script.title =  curScriptTitle;
                } else {
                    var randomTitle = Math.floor(100000 * (Math.random() + 1));
                    while(scripts[randomTitle] != null) randomTitle = Math.floor(100000 * (Math.random() + 1));
                    script.title =  randomTitle;
                }
            }
            script.createdTime = new Date().getTime();
            scripts[script.title] = script;
            localStorage.setItem('scripts', JSON.stringify(scripts));
            localStorage.removeItem('tmpScript');
        }
    });

    const updateScript = (chainContractConfig, event) => {
        if (modifyScript && chainContractConfig.title != curModifiedTitle) {
            delete script[curModifiedTitle];
        }
        script[chainContractConfig.title] = {...chainContractConfig, ...event};
        console.log(script);
    }

    const handleEventMonitorOk = () => {
        eventMonitorForm.validateFields()
            .then(values => {
                console.log(values);
                const eventElement = JSON.parse(values.event);
                const eventSig = web3.eth.abi.encodeEventSignature(eventElement);
                //const eventInfo = values.event.split(',');
                //const key = currentChain + '_' + contractAddr + '_' + eventInfo[1] + '_' + new Date().getTime();
                const event = {
                    type: currentScriptType, 
                    name: eventElement.name, 
                    signature: eventSig,
                    element: eventElement,
                    filter: values.filter,
                    result: []
                }
                updateScript(chainContractConfig, event);
                setAddEventMonitorVisible(false);
                eventMonitorForm.resetFields();
                chainContractForm.resetFields();
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    }

    const handlePendingTxMonitorOk = () => {
        //
        pendingTxMonitorForm.validateFields()
            .then(values => {
                const functionElement = JSON.parse(values.function);
                const functionSig = web3.eth.abi.encodeFunctionSignature(functionElement);
                const functionMonitored = {
                    type: currentScriptType,
                    name: functionElement.name,
                    signature: functionSig,
                    element: functionElement,
                    parameterCondition: {}
                }
                if (values.msgValue != null && values.msgValue.op != null && values.msgValue.value != null) {
                    functionMonitored.valueCondition = values.msgValue;
                }
                functionElement.inputs.map(input => {
                    if (values[input.name].op != null && values[input.name].value != null) {
                        functionMonitored.parameterCondition[input.name] = values[input.name];
                    }
                })
                updateScript(chainContractConfig, functionMonitored);
                pendingTxMonitorForm.resetFields();
                chainContractForm.resetFields();
                setAddPendingTxMonitorVisible(false);
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    }

    const handleSelectFunctionOk = () => {
        functionSelectedForm.validateFields()
            .then(values => {
                console.log('read data', values);
                
                const functionElement = JSON.parse(values.function);
                const functionSig = web3.eth.abi.encodeFunctionSignature(functionElement);
                const functionSelected = {
                    type: currentScriptType,
                    name: functionElement.name,
                    signature: functionSig,
                    element: functionElement,
                    parameters: []
                }
                functionElement.inputs.map((input, index) => {
                    const inputName = utils.isEmptyObj(input.name) ? 'parameter #' + index : input.name;
                    if (values[inputName].valueType == 'constant') {
                        functionSelected.parameters.push({paraName: inputName, value: values[inputName].value});
                    } else {
                        functionSelected.parameters.push({step: values[inputName].step,
                                                           referenceParaName: input.name, 
                                                           referenceParaIndex: index,
                                                           op: values[inputName].op,
                                                           externalValue: values[inputName].externalValue});
                    }
                });
                setFunctionSelectedConfig(functionSelected);
                setSelectFunctionInContractVisible(false); 
                setDependencyConfigVisible(true);
            })
    }

    const handleDependencyConfigOK = () => {        
        dependencyConfigForm.validateFields().then(values => {
            console.log(values);
            if (currentScriptType == 'wFunc') {
                setDependencyConfigVisible(false); 
                setLeftConfigVisible(true);
            } else {
                setDependencyConfigVisible(false); 
            }
        });
    }

    const handleChainContractOk = () => {
        chainContractForm.validateFields()
            .then(values => {
                const newChainContractConfig = {
                    title: values.title,
                    chainId: values.chain,
                    to: values.contractAddr
                }
                var from = null;
                if (values['from'] != null) {
                    if (values['from'].valueType == 'constant') 
                        from = values['from'].address;
                    else {
                        from = {};
                        from.step = values['from'].step; 
                        if (script[from.step].element.type == 'pendingTx' || script[from.step].element.type == 'executedTx') {
                            try {
                                const obj = JSON.prarse(from.address);
                                from.referenceType = obj.referenceType == 'from' ? 1 : 2;   // 1: ValueType.from  2: ValueType.to
                            } catch (error) {
                                from.referenceType = 5;  // ValueType.parameter
                            }
                        }
                        from.address = values['from'].address;
                    }
                    newChainContractConfig.from = from;
                }
                setChainContractConfig(newChainContractConfig);
                console.log(newChainContractConfig);
                setConfigChainContractVisible(false);
                if (currentScriptType == 'event') {
                    setAddEventMonitorVisible(true);
                } else if (currentScriptType == 'pendingTx' || currentScriptType == 'executedTx') {
                    setAddPendingTxMonitorVisible(true);
                } else if (currentScriptType == 'rFunc') {
                    setSelectFunctionInContractVisible(true);
                } else if (currentScriptType == 'wFunc') {
                    setSelectFunctionInContractVisible(true);
                }

                var subScripts = localStorage.getItem('subScripts');
                if (subScripts != null) {
                    subScripts = JSON.parse(subScripts);
                    if (subScripts[values.title] == null) {
                        subScripts[values.title] = {}
                    }
                } else {
                    subScripts = {}
                    subScripts[values.title] = {}
                }
                subScripts[values.title]['type'] = 'event';
                subScripts[values.title]['chainContractConfig'] = values;
                localStorage.setItem('subScripts', JSON.stringify(subScripts));
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    }

    const handleSendTxOk = () => {
        leftConfigForm.validateFields()
            .then(values => {
                console.log(values);
            });
    }

    const addNewChain = () => {
        setNewChainVisible(true);
    }

    const syncABI = () => {
        if (BroswerScan[currentChain] == null) {
            Modal.warning({title: 'Warning', content: 'No web service to get the ABI on this chain, please manually input the ABI'});
            return;
        }
        const getValidABIUrl = getABIUrl.replace('{scanUrl}', BroswerScan[currentChain].webUrl)
                                        .replace('{apiKey}', BroswerScan[currentChain].apiKey)
                                        .replace('{contractAddr}', contractAddr);
        fetch(getValidABIUrl, {}).then(resp => {
            resp.json().then(abiInfo => {
              if (abiInfo.status === '1') {
                const contractAbi = JSON.parse(abiInfo.result);
                updateABIInfo(currentChain, contractAddr, contractAbi);
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
        updateABIInfo(currentChain, contractAddr, JSON.parse(importedABI));
        setImportABIVisible(false);
    }

    const checkChainId = (_, value) => {
        if (evmChainInfo[value] == null) {
          return Promise.resolve();
        }
    
        return Promise.reject(new Error('Chain has been exist!'));
    }

    const checkAddress = (_, value) => {
        if (utils.isEmptyObj(value) || web3.utils.isAddress(value)) {
          return Promise.resolve();
        }
    
        return Promise.reject(new Error('Address is invalid!'));
    }

    const checkFilter = (_, value) => {
        try {
            const filter = utils.isEmptyObj(value) ? '' : JSON.parse(value);
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(new Error('Invalid filter content:' + error.message));
        }
    }

    const checkTitle = (_, value) => {
        if (isInternalDependency(value))
            return Promise.reject(new Error('Title can NOT use keywords: timer, blockNumber, gasPrice, customScript.'));
        else if (script[value] == null || (modifyScript && value == curModifiedTitle))
            return Promise.resolve();
        else 
            return Promise.reject(new Error('Title can NOT be duplicated.'));
    }

    const openStepEditor = (scriptType, modalTitle, stepNumber) => {
        setCurrentScriptType(scriptType);
        setModalTitle(modalTitle);
        setConfigChainContractVisible(true);
        SetTotalStep(stepNumber);
    }

    const addScript = (scriptType, modalTitle, stepNumber) => {
        setModifyScript(false);
        openStepEditor(scriptType, modalTitle, stepNumber);
    }

    const getReadableType = (stepType) => {        
        if (stepType == 'event') {
            return 'monitor event';
        }
        if (stepType == 'pendingTx') {
            return 'monitor transaction in mempool';
        }
        if (stepType == 'executedTx') {
            return 'monitor transaction in latest block';
        }
        if (stepType == 'rFunc') {
            return 'read contract state';
        }
        if (stepType == 'wFunc') {
            return 'send transaction';
        }
        if (stepType == 'clearResult') {
            return 'clear result';
        }
    }

    const deleteStep = (stepTitle) => {
        delete script[stepTitle];
        const tmpScript = JSON.parse(JSON.stringify(script));
        setScript(tmpScript);
    }

    const modifyStep = (subScriptTitle) => {
        var subScripts = localStorage.getItem('subScripts');
        if (subScripts != null) {
            setModifyScript(true);
            setCurModifiedTitle(subScriptTitle);
            subScripts = JSON.parse(subScripts);
            const subScript = subScripts[subScriptTitle];
            const stepType = subScript.type;
            if (stepType == 'event') {
                setInitialValuesOfOne(subScript['chainContractConfig']);
                openStepEditor('event', 'Event Config', 2);
            }
            if (stepType == 'pendingTx') {
                openStepEditor('pendingTx', 'Transaction Config(in mempool)', 2);
            }
            if (stepType == 'executedTx') {
                openStepEditor('executedTx', 'Transaction Config(in latest block)', 2);
            }
            if (stepType == 'rFunc') {
                openStepEditor('rFunc', 'Read Contract Data Config', 3);
            }
            if (stepType == 'wFunc') {
                openStepEditor('wFunc', 'Send Transaction Config', 4);
            }
            if (stepType == 'clearResult') {
                
            }
        }
    }

    const isSameOrSimiliarType = (firstType, secondType) => {
        if (firstType == secondType) return true;

        // eg: uint int uint256
        if (firstType.indexOf('int') >= 0 && secondType.indexOf('int') >= 0) return true;

        // eg: string, string[]
        if (firstType.indexOf(secondType) >= 0 || secondType.indexOf(firstType) >= 0) return true;

        return false;
    }

    const formItemInFunctionSelectedModal = (input, index) => {
        var inputName = utils.isEmptyObj(input.name) ? 'parameter #' + index : input.name;
        var valueType = functionSelectedForm.getFieldValue([inputName, 'valueType']);
        if (utils.isEmptyObj(valueType)) valueType = 'constant';
        //console.log(inputName, valueType);
        const formItem = 
            <Form.Item 
            key={inputName}
            label={inputName}
            rules={[{ required: true }]}
            >   
                <Input.Group compact>
                    <Form.Item
                        name={[inputName, 'valueType']}
                        noStyle
                    >
                        <Select placeholder="Select value type" style={{width: 200, textAlign: 'center'}}>
                            <Option value="constant">constant value</Option>
                            <Option value="dynamic">dynamic value</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        noStyle
                        shouldUpdate//={(prevValues, currentValues) => prevValues[input.name]['valueType'] !== currentValues[input.name]['valueType']}
                    >
                    {({ getFieldValue }) =>
                        !utils.isEmptyObj(getFieldValue([inputName, 'valueType'])) && getFieldValue([inputName, 'valueType']) !== 'constant' ? (
                            <Form.Item name={[inputName, 'step']}>
                                <Select placeholder="Select subScript" style={{width: 270, textAlign: 'center'}}>
                                {
                                    Object.entries(script).map(entry => 
                                        <Option title={entry[0]} value={entry[0]}>{entry[0]}</Option>
                                    )
                                }
                                </Select>
                            </Form.Item>
                        ) : null
                    }
                    </Form.Item>
                    <Form.Item
                        noStyle
                        shouldUpdate//={(prevValues, currentValues) => prevValues[input.name]['valueType'] !== currentValues[input.name]['valueType']}
                    >
                    {({ getFieldValue }) =>
                        !utils.isEmptyObj(getFieldValue([inputName, 'valueType'])) && getFieldValue([inputName, 'valueType']) !== 'constant' ? (
                            [
                                <Form.Item name={[inputName, 'referenceParaName']}>
                                    <Select placeholder="Select the value source" style={{width: 470, textAlign: 'center'}}>
                                    {
                                        getFieldValue([inputName, 'step']) == null ? 
                                        null :
                                        isInputStep(script[getFieldValue([inputName, 'step'])]) ?                                        
                                            script[getFieldValue([inputName, 'step'])].element.inputs.map(copyInput => {
                                                if (isSameOrSimiliarType(input.type, copyInput.type))
                                                    return <Option value={copyInput.name}>value of input parameter '{copyInput.name}' in {script[getFieldValue([inputName, 'step'])].element.name}</Option>;
                                                }
                                            ) 
                                            :
                                            script[getFieldValue([inputName, 'step'])].element.outputs.map(copyOutput => {
                                                if (isSameOrSimiliarType(input.type, copyOutput.type))
                                                    return <Option value={copyOutput.name}>value of output parameter '{copyOutput.name}' in {script[getFieldValue([inputName, 'step'])].element.name}</Option>;
                                                }
                                            )
                                    }
                                    </Select>
                                </Form.Item>,
                                <div>The selected value could be adjusted by followed option.</div>,
                                <Form.Item
                                    name={[inputName, 'op']}
                                    noStyle
                                >
                                    <Select placeholder="Select operator" style={{width: 235, textAlign: 'center'}}>
                                        <Option value="+">{'+'}</Option>
                                        <Option value="-"> {'-'}</Option>
                                        <Option value="*">{'*'}</Option>
                                        <Option value="/">{'/'}</Option>
                                        <Option value="%">{'%'}</Option>
                                    </Select>
                                </Form.Item>,
                                <Form.Item
                                    name={[inputName, 'externalValue']}
                                    noStyle
                                >
                                    <InputNumber 
                                        style={{
                                            width: 235,
                                        }}
                                    />
                                </Form.Item>
                            ]
                        ) : (
                            <Form.Item name={[inputName, 'value']}>
                                <Input type='text' style={{ width: 470 }}/>
                            </Form.Item>
                        )
                    }
                    </Form.Item>
                </Input.Group>
            </Form.Item>;
        return formItem;
    }

    const isInputStep = (step) => {
        return step.type == 'event' || step.type == 'pendingTx' || step.type == 'executedTx';
    }

    const isInternalDependency = (dependencyName) => {
        return dependencyName == 'timer' || dependencyName == 'blockNumber' || dependencyName == 'gasPrice' || dependencyName == 'customScript';
    }

    const checkScript = async (path) => {
        const scriptCode = dependencyConfigForm.getFieldValue(path);
        async function looseJsonParse(obj){
            return await Function('require', 'BigNumber', 'web3', '"use strict";return (' + obj + '())')(require, require('bignumber.js'), web3);
        }
        if (scriptCode.indexOf('localStorage') > 0) {
            console.log('can NOT use localStorage to access the local info');
            return;
        }
        console.log(await looseJsonParse(scriptCode));
    }

    const saveScriptTitle = (v) => {
        if (scripts[curScriptTitle] != null) {
            Modal.warning({title: 'Warning', content: 'The title of script has been exist. Please change it.'});
            return;
        }
        script.title = curScriptTitle;
        localStorage.setItem('tmpScript', JSON.stringify(script));
    }

    return (
        <div>
            <Typography>
                <Title>{window.location.href.indexOf('addScript') > 0 ? 'Add Script' : 'Modify Script'}</Title>
                <Paragraph>
                    Point 1: Create event or transaction to be monitored, the transaction could be in memory bool or has been in block.
                </Paragraph>
                <Paragraph>
                    Point 2: Read the state of contract, and the result could be used in other entries.
                </Paragraph>
                <Paragraph>
                    Point 3: Create upcoming transactions that depend on previously created monitored events and transactions, 
                    as well as on the current contract state or the status of transactions sent out here.
                </Paragraph>
            </Typography>
            <Space style={{marginBottom: 20}}>
                <div>Script Title: </div>
                <Input type='text' style={{width: 800}} showCount maxLength={100} defaultValue={curScriptTitle} onChange={e => setCurScriptTitle(e.target.value)}/>
                <Button type='primary' onClick={saveScriptTitle}>Save</Button>
            </Space>
            <Collapse>
                <Panel header={'Monitor event or transaction'}>
                    <Space>
                        <Button type='primary' onClick={() => addScript('event', 'Event Config', 2)}>Monitor Event</Button>
                        <Button type='primary' onClick={() => addScript('pendingTx', 'Transaction Config(in mempool)', 2)}>Monitor Tx in mempool</Button>
                        <Button type='primary' onClick={() => addScript('executedTx', 'Transaction Config(in latest block)', 2)}>Monitor Tx in latest block</Button>
                    </Space>
                    <p/>
                    <Space wrap>
                        {
                            Object.entries(script).map(entry => {
                                const step = entry[1];
                                if (step.type != 'event' && step.type != 'pendingTx' && step.type != 'executedTx') return;
                                const externalInfo = [];
                                var interfaceType = '';
                                if (step.type == 'event') {
                                    interfaceType = 'event';
                                    if (!utils.isEmptyObj(step.filter))
                                        externalInfo.push(<p><Text strong>filter:</Text> <Text code>{step.filter}</Text></p>);
                                } else if (step.type == 'pendingTx' || step.type == 'executedTx') {
                                    interfaceType = 'function';
                                    if (step.valueCondition != null) {
                                        externalInfo.push(<p><Text strong>msg.value:</Text> <Text code>{step.valueCondition.op} {step.valueCondition.value} ETH</Text></p>);
                                    }
                                    var paraCondition = '';
                                    for (const [parameter, condition] of Object.entries(step.parameterCondition)) {
                                        paraCondition += parameter + ' ' + condition.op + ' ' + condition.value + ' && ';
                                    }
                                    if (paraCondition.length > 0) {
                                        externalInfo.push(<p><Text strong>parameter condition:</Text><Text code>{paraCondition.substr(0, paraCondition.length - ' && '.length)}</Text></p>);
                                    }
                                }
                                return <Card title={step.title} style={{ width: 400 }}>
                                    <p><Text strong>Action:</Text> <Text keyboard>{getReadableType(step.type)}</Text></p>
                                    <p><Text strong>Chain:</Text> <Text keyboard>{evmChainIds[step.chainId]}(chainId = {step.chainId})</Text></p>
                                    <p><Text strong>Contract:</Text> <Text code>{step.to}</Text></p>
                                    <p><Text strong>{interfaceType}:</Text> <Text code>{step.name}</Text></p>
                                    {
                                        externalInfo
                                    }
                                    <Divider plain>
                                        <Space size='large'>
                                            <Button type='primary' onClick={() => deleteStep(step.title)}>Delete</Button>
                                            <Button type='primary' onClick={() => modifyStep(step.title)}>Modify</Button>
                                        </Space>
                                    </Divider>
                                </Card>
                                }
                            )
                        }
                    </Space>
                </Panel>
                <Panel header={'Read data from contract/CEX/Web2'}>
                    <Space>
                        <Button type='primary' onClick={() => addScript('rFunc', 'Read Contract Data Config', 3)}>Read contract</Button>
                        <Button type='primary' onClick={() => addScript('rCex', 'Read CEX Config')}>Read CEX</Button>
                        <Button type='primary' onClick={() => addScript('rCex', 'Read Web2 Data')}>Read Web2 Data</Button>
                    </Space>
                </Panel>
                <Panel header={'Send transaction'}>
                    <Space>
                        <Button type='primary' onClick={() => addScript('wFunc', 'Send Transaction Config', 4)}>Send transaction</Button>
                    </Space>
                </Panel>
                <Panel header={'Send TG/Discord notifaction / Record information to DB'}>
                    <Space>
                        <Button type='primary'>Send notifaction</Button>
                        <Button type='primary'>Record information</Button>
                    </Space>
                </Panel>
                <Panel header={'Clear result'}>
                    <Space>
                        <Button type='primary'>Clear Result</Button>
                    </Space>
                </Panel>
            </Collapse>
            <Modal
                visible={configChainContractVisible}
                title={modalTitle + ' 1/' + totalStep}
                okText="Next"
                cancelText="Cancel"
                onCancel={() => setConfigChainContractVisible(false)}
                onOk={handleChainContractOk}
                footer={[
                    <Button key="back" onClick={() => setConfigChainContractVisible(false)}>
                      Cancel
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleChainContractOk}>
                      Next
                    </Button>
                  ]}
                >
                <Form
                    form={chainContractForm}
                    layout="vertical"
                    name="form_in_modal"
                    initialValues={initialValuesOfOne}
                >      
                    <Form.Item 
                        name="title" 
                        label="title"
                        rules={[{ required: true, message: 'Please input the unique title of this step!' }, {validator: checkTitle}]}
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
                    {
                        currentScriptType == 'rFunc' || currentScriptType == 'wFunc' ? 
                        <Form.Item 
                            label="from address"
                            rules={[{ required: true, message: 'Please input the from address of transaction!' }]}
                        >                            
                            <Input.Group compact>
                                    <Form.Item
                                        name={['from', 'valueType']}
                                        noStyle
                                    >
                                        <Select placeholder="Select value type" style={{width: 200, textAlign: 'center'}}>
                                            <Option value="constant">constant value</Option>
                                            <Option value="dynamic">dynamic value</Option>
                                        </Select>
                                    </Form.Item>
                                    {
                                        fromValueType == 'constant' ? 
                                            null
                                            : 
                                            <Form.Item
                                                name={['from', 'step']}
                                                noStyle
                                            >
                                                <Select placeholder="Select subScript" style={{width: 270, textAlign: 'center'}}>
                                                    {
                                                        Object.entries(script).map(entry => 
                                                            <Option title={entry[0]} value={entry[0]}>{entry[0]}</Option>
                                                        )
                                                    }
                                                </Select>
                                            </Form.Item>
                                    }
                                    {
                                        fromValueType == 'constant' ? 
                                            <Form.Item
                                                name={['from', 'address']}
                                                noStyle
                                                rules={[{ required: true, message: 'Please input the address!' }, {validator: checkAddress}]}
                                            >
                                                {
                                                    currentScriptType == 'rFunc' ? 
                                                        <Input type='text' style={{ width: 470 }} placeholder='0x...'/>
                                                        :
                                                        <Select placeholder="Select address" style={{width: 470, textAlign: 'center'}}>
                                                        {
                                                            [...accountList, ...mmAccounts].map(account => 
                                                                <Option title={'0x' + account.address} value={'0x' + account.address}>0x{account.address}</Option>
                                                            )
                                                        }
                                                    </Select>
                                                }
                                                
                                            </Form.Item>
                                            :
                                            script[fromStep] != null ?
                                                <Form.Item
                                                    name={['from', 'address']}
                                                    noStyle
                                                    rules={[{ required: true, message: 'Please select the address source!' }]}
                                                >
                                                    <Select placeholder="Select address source" style={{width: 470, textAlign: 'center'}}>
                                                        {
                                                            (script[fromStep].element.type == 'event' || !script[fromStep].element.constant) ?  // 事件和write交易需要从inputs里读取数据，而view接口从outputs里读数据
                                                            script[fromStep].element.inputs.map(input => {
                                                                if (input.type == 'address') {
                                                                    return <Option value={input.name}>value of input parameter '{input.name}' in {script[fromStep].element.name}</Option>;
                                                                }
                                                            })
                                                            :
                                                            script[fromStep].element.outputs.map(output => {
                                                                if (output.type == 'address') {
                                                                    return <Option value={output.name}>value of output parameter '{output.name}' in {script[fromStep].element.name}</Option>;
                                                                }
                                                            })
                                                        }
                                                        {
                                                            script[fromStep].type == 'pendingTx' || script[fromStep].type == 'executedTx' ? 
                                                            [
                                                                <Option value={JSON.stringify({referenceType: 'from'})}>value of 'from' in transaction</Option>,
                                                                <Option value={JSON.stringify({referenceType: 'to'})}>value of 'to' in transaction</Option>
                                                            ]
                                                            :
                                                            null
                                                        }
                                                    </Select>
                                                </Form.Item>
                                                :
                                                null
                                            
                                    }
                                </Input.Group>
                        </Form.Item>
                        :
                        null
                    }
                    
                    <Form.Item label="Contract Address" required={true}>     
                        <Space>      
                            <Form.Item noStyle name="contractAddr" rules={[{ required: true, message: 'Please input the address of contract!' }]}>                                
                                <Input style={{ width: 400}} type="textarea" />
                            </Form.Item>  
                            {
                                utils.isEmptyObj(contractAddr) ?  
                                null 
                                    :
                                isABIOK(currentChain, contractAddr) ?
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
                </Form>
            </Modal>
            <Modal
                visible={addEventMonitorVisible}
                title={modalTitle + ' 2/' + totalStep}
                okText="Confirm"
                cancelText="Previous"
                onCancel={() => setAddEventMonitorVisible(false)}
                onOk={handleEventMonitorOk}
                footer={[
                    <Button key="back" onClick={() => {setAddEventMonitorVisible(false); setConfigChainContractVisible(true)}}>
                      Previous
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
                        name="event"
                        label="event"
                        rules={[{ required: true, message: 'Please select the event to be monitored!' }]}
                    >
                        <Select showSearch style={{ width: 470}}>
                            {   
                                isABIOK(currentChain, contractAddr) ? 
                                    contractABIInfo[currentChain][contractAddr].map(element => {
                                        if (element.type == 'event') {
                                            var parameters = '';
                                            element.inputs.map(input => {
                                                parameters += input.internalType + ' ' + input.name + ', ';
                                            })
                                            if (parameters.length > 0) parameters = parameters.substr(0, parameters.length - 2);
                                            
                                            return <Option key={JSON.stringify(element)}>{element.name}({parameters})</Option>
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
                visible={addPendingTxMonitorVisible}
                title={modalTitle + ' 2/' + totalStep}
                okText="Confirm"
                cancelText="Previous"
                onCancel={() => setAddPendingTxMonitorVisible(false)}
                onOk={handlePendingTxMonitorOk}
                footer={[
                    <Button key="back" onClick={() => {setAddPendingTxMonitorVisible(false); setConfigChainContractVisible(true)}}>
                      Previous
                    </Button>,
                    <Button key="submit" type="primary" onClick={handlePendingTxMonitorOk}>
                      Confirm
                    </Button>
                  ]}
                >
                <Form
                    form={pendingTxMonitorForm}
                    layout="vertical"
                    name="form_in_modal"
                >   
                    <Form.Item
                        name="function"
                        label="function"
                        rules={[{ required: true, message: 'Please select the function to be monitored!' }]}
                    >
                        <Select showSearch style={{ width: 470}}>
                            {   
                                isABIOK(currentChain, contractAddr) ? 
                                    contractABIInfo[currentChain][contractAddr].map(element => {
                                        if (element.type == 'function' && !element.constant) {
                                            var parameters = '';
                                            element.inputs.map(input => {
                                                parameters += input.internalType + ' ' + input.name + ', ';
                                            })
                                            if (parameters.length > 0) parameters = parameters.substr(0, parameters.length - 2);
                                            
                                            return <Option title={element.name + '(' + parameters + ')'} key={JSON.stringify(element)}>{element.name}({parameters})</Option>
                                        }
                                    }) : null
                            }
                        </Select>
                    </Form.Item>   
                    {
                        pendingTxFunction != null && JSON.parse(pendingTxFunction).payable ? 
                        <Form.Item 
                            label="msg.value"
                        >   
                            <Input.Group compact>
                                <Form.Item
                                    name={['msgValue', 'op']}
                                    noStyle
                                >
                                    <Select placeholder="Select operator" style={{width: 120, textAlign: 'center'}}>
                                        <Option value=">">{'>'}</Option>
                                        <Option value="<"> {'<'}</Option>
                                        <Option value=">=">{'>='}</Option>
                                        <Option value="<=">{'<='}</Option>
                                        <Option value="==">{'=='}</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item
                                    name={['msgValue', 'value']}
                                    noStyle
                                >
                                    <InputNumber addonAfter='ETH'
                                    style={{
                                        width: 350,
                                    }}
                                    />
                                </Form.Item>
                            </Input.Group>
                        </Form.Item> 
                        : 
                        null
                    }
                    {
                        pendingTxFunction != null ?
                        JSON.parse(pendingTxFunction).inputs.map(input => 
                            <Form.Item 
                            label={'parameter:' + input.name}
                            >   
                            <Input.Group compact>
                                <Form.Item
                                    name={[input.name, 'op']}
                                    noStyle
                                >
                                    <Select placeholder="Select operator" style={{width: 120, textAlign: 'center'}}>
                                        <Option value=">">{'>'}</Option>
                                        <Option value="<"> {'<'}</Option>
                                        <Option value=">=">{'>='}</Option>
                                        <Option value="<=">{'<='}</Option>
                                        <Option value="==">{'=='}</Option>
                                        <Option value="include">{'include'}</Option>
                                        <Option value="includedBy">{'includedBy'}</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item
                                    name={[input.name, 'value']}
                                    noStyle
                                >
                                    <Input
                                    style={{
                                        width: 350,
                                    }}
                                    />
                                </Form.Item>
                            </Input.Group>
                        </Form.Item> )
                        :
                        null
                    }
                    
                </Form>
            </Modal>

            <Modal
                visible={selectFunctionInContractVisible}
                title={modalTitle + ' 2/' + totalStep}
                okText="Confirm"
                cancelText="Previous"
                onCancel={() => setSelectFunctionInContractVisible(false)}
                onOk={handleSelectFunctionOk}
                footer={[
                    <Button key="back" onClick={() => {setSelectFunctionInContractVisible(false); setConfigChainContractVisible(true)}}>
                      Previous
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleSelectFunctionOk}>
                      Next
                    </Button>
                  ]}
                >
                <Form
                    form={functionSelectedForm}
                    layout="vertical"
                    name="form_in_modal"
                >   
                    <Form.Item
                        name="function"
                        label="function"
                        rules={[{ required: true, message: 'Please select the function to invoke!' }]}
                    >
                        <Select showSearch style={{ width: 470}}>
                            {   
                                isABIOK(currentChain, contractAddr) ? 
                                    contractABIInfo[currentChain][contractAddr].map(element => {
                                        if (element.type == 'function' && element.constant) {
                                            var parameters = '';
                                            element.inputs.map(input => {
                                                parameters += input.internalType + ' ' + input.name + ', ';
                                            })
                                            if (parameters.length > 0) parameters = parameters.substr(0, parameters.length - 2);
                                            
                                            return <Option title={element.name + '(' + parameters + ')'} key={JSON.stringify(element)}>{element.name}({parameters})</Option>
                                        }
                                    }) : null
                            }
                        </Select>
                    </Form.Item>   
                    {
                            readDataFunction != null && JSON.parse(readDataFunction).inputs.map((input, i) => formItemInFunctionSelectedModal(input, i))
                    }
                </Form>
            </Modal>
            <Modal
                visible={dependencyConfigVisible}
                title={modalTitle + ' 3/' + totalStep}
                okText="Confirm"
                cancelText="Previous"
                onCancel={() => setDependencyConfigVisible(false)}
                onOk={handleDependencyConfigOK}
                footer={[
                    <Button key="back" onClick={() => {setDependencyConfigVisible(false); setSelectFunctionInContractVisible(true)}}>
                      Previous
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleDependencyConfigOK}>
                      {currentScriptType == 'wFunc' ? 'Next' : 'Confirm'}
                    </Button>
                  ]}
                >
                <Form
                    form={dependencyConfigForm}
                    layout="vertical"
                    name="form_in_modal"
                >   
                    <Form.List name="dependency">
                        {(fields, { add, remove }) => (
                            <>
                            <Form.Item>
                                <Button
                                type="dashed"
                                onClick={() => add()}
                                block
                                icon={<PlusOutlined />}
                                >
                                Add Dependency
                                </Button>
                                This subScript will be executed when the conditions of the dependency are met.
                            </Form.Item>
                            
                            {fields.map(({ key, name, ...restField }) => {
                                return <Input.Group
                                    key={key}
                                >
                                    <div style={{width: 150, marginTop: 20, textAlign: 'center'}}>Dependency {name} <Tooltip title="delete this dependency"><MinusCircleOutlined onClick={() => remove(name)} /></Tooltip></div>
                                    <p/>
                                    <Form.Item
                                        {...restField}
                                        name={[name, "step"]}
                                        rules={[{ required: true, message: "Select dependency object please" }]}
                                    >
                                        <Select placeholder="Select the dependency object" style={{width: 470, textAlign: 'center'}}>
                                            {
                                                Object.entries(script).map(entry => 
                                                    <Option title={entry[0]} value={entry[0]}>{entry[0]}</Option>
                                                )
                                            }
                                            {
                                                [
                                                    <Option value={'timer'}>set condition of the timer</Option>,
                                                    <Option value={'blockNumber'}>set the condition of block height</Option>,
                                                    <Option value={'gasPrice'}>set the condition of gas price</Option>,
                                                    <Option value={'customScript'}>set the custom JS script</Option>
                                                ]
                                            }
                                        </Select>
                                    </Form.Item>
                                    {
                                    <Form.Item
                                        noStyle
                                        shouldUpdate={(prevValues, curValues) => prevValues['dependency'][name]?.step !== curValues['dependency'][name]?.step}
                                    >
                                        { () => {
                                            const stepName = dependencyConfigForm.getFieldValue(['dependency', name, 'step']);
                                            //console.log(name, stepName);
                                            return <Form.Item
                                                name={[name, "parameter"]}
                                            >
                                            {
                                                stepName == null || isInternalDependency(stepName)
                                                || (script[stepName] != null && script[stepName].element.type == 'wFunc') ? 
                                                <div style={{display: 'none'}} /> 
                                                :
                                                <Select placeholder="Select input source" style={{width: 470, textAlign: 'center'}}>
                                                    {
                                                        (script[stepName].element.type == 'event' 
                                                        || !script[stepName].element.constant) ?  // 事件和write交易需要从inputs里读取数据，而view接口从outputs里读数据
                                                        script[stepName].element.inputs.map(input => {
                                                            if (input.type == 'address') {
                                                                return <Option value={input.name}>value of input parameter '{input.name}' in {script[stepName].element.name}</Option>;
                                                            }
                                                        })
                                                        :
                                                        script[stepName].element.outputs.map(output => {
                                                            if (output.type == 'address') {
                                                                return <Option value={output.name}>value of output parameter '{output.name}' in {script[stepName].element.name}</Option>;
                                                            }
                                                        })
                                                    }
                                                </Select>
                                            }
                                            </Form.Item> 
                                            }
                                        }
                                    </Form.Item>
                                    }

                                    {
                                    <Form.Item
                                    noStyle
                                    shouldUpdate={(prevValues, curValues) => prevValues['dependency'][name]?.step !== curValues['dependency'][name]?.step}
                                    >
                                    {
                                        () => {
                                            const stepName = dependencyConfigForm.getFieldValue(['dependency', name, 'step']);
                                            if (stepName == 'timer') {
                                                const time = dependencyConfigForm.getFieldValue(['dependency', name, 'compareValue']);
                                                dependencyConfigForm.setFieldValue(['dependency', name, 'compareValue'], moment(time));
                                            }
                                            return stepName == null 
                                            || (script[stepName] != null && script[stepName].element.type == 'wFunc') ? 
                                                <div style={{display: 'none'}}/> :
                                                (
                                                    <div style={{marginTop: -60}}>
                                                        {isInternalDependency(stepName) ? '' : 'The input value could be adjusted by followed option.'}
                                                        {
                                                            stepName == 'customScript' ? 
                                                            null
                                                            :
                                                            <Form.Item
                                                                name={[name, 'compareType']}
                                                                noStyle
                                                            >
                                                                <Select placeholder="Select operator" style={{width: 235, textAlign: 'center'}}>
                                                                    <Option value=">">{'>'}</Option>
                                                                    <Option value="<"> {'<'}</Option>
                                                                    <Option value=">=">{'>='}</Option>
                                                                    <Option value="<=">{'<='}</Option>
                                                                    <Option value="==">{'=='}</Option>
                                                                    <Option value="include">{'include'}</Option>
                                                                    <Option value="includedBy">{'includedBy'}</Option>
                                                                </Select>
                                                            </Form.Item>
                                                        }
                                                        
                                                        <Form.Item
                                                            name={[name, 'compareValue']}
                                                            noStyle
                                                        >
                                                            {
                                                                stepName == 'timer' ?
                                                                <DatePicker style={{width: 235}} showTime/>
                                                                :
                                                                stepName == 'blockNumber' ?
                                                                <InputNumber min={1} style={{width: 235}} placeholder='input block height'/>
                                                                :
                                                                stepName == 'gasPrice' ?
                                                                <InputNumber min={1} style={{width: 235}} placeholder='input gas price' addonAfter='Gwei'/>
                                                                :
                                                                stepName == 'customScript' ?
                                                                <Space>
                                                                    <Input.TextArea rows={6}  style={{width: 390}} placeholder='input js function which type of return value should be bool.'/>
                                                                    <Button type='primary' onClick={() => checkScript(['dependency', name, 'compareValue'])}>Check</Button>
                                                                </Space>
                                                                :
                                                                <InputNumber 
                                                                    style={{
                                                                        width: 235,
                                                                    }}
                                                                />
                                                            }
                                                            
                                                        </Form.Item>
                                                    </div>
                                                )
                                            }
                                        }
                                    </Form.Item>
                                    }
                                    
                                </Input.Group>
                            })}
                            </>
                        )}
                    </Form.List>
                    
                   <Form.Item
                        label='logical relationship of dependencies'
                        name={["logic"]}
                        style={{marginTop: 40}}
                        shouldUpdate={(prevValues, currentValues) => {
                            if (currentValues.dependency != null) {
                                setDependencyLength(currentValues.dependency.length);
                            }
                            return prevValues.dependency != null && currentValues.dependency != null && prevValues.dependency.length != currentValues.dependency.length;
                            }
                        }
                    >
                        <Select style={{width: 470, textAlign: 'center'}} disabled={dependencyLength < 2}>
                            <Option value={'and'}>and</Option>
                            <Option value={'or'}>or</Option>
                        </Select>
                    </Form.Item>
                    
                    <Form.Item
                         label='Delayed execution time after dependencies are met'
                         name={["delayedTime"]}
                         style={{marginTop: 40}}
                     >
                         <InputNumber min={0} addonAfter='second' style={{width: 470, textAlign: 'center'}}/>
                     </Form.Item>
                </Form>
            </Modal>
            <Modal
                visible={leftConfigVisible}
                title={modalTitle + ' 4/' + totalStep}
                okText="Confirm"
                cancelText="Previous"
                onCancel={() => setLeftConfigVisible(false)}
                onOk={handleSendTxOk}
                footer={[
                    <Button key="back" onClick={() => {setLeftConfigVisible(false); setDependencyConfigVisible(true); }}>
                      Previous
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleSendTxOk}>
                      Confirm
                    </Button>
                  ]}
                >
                    <Form
                        form={leftConfigForm}
                        layout="vertical"
                        name="form_in_modal"
                    >
                        <Form.Item 
                            label="gas price"
                            rules={[{ required: true, message: 'Please input the gas price of this tx!' }]}
                        >                            
                            <Input.Group>
                                <Form.Item
                                    name={['gasPrice', 'valueType']}
                                    noStyle
                                >
                                    <Select placeholder="Select value type" style={{width: 235, textAlign: 'center'}}>
                                        <Option value="constant">constant value</Option>
                                        <Option value="dynamic">dynamic value</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item
                                    noStyle
                                    shouldUpdate//={(prevValues, currentValues) => prevValues[input.name]['valueType'] !== currentValues[input.name]['valueType']}
                                >
                                {({ getFieldValue }) =>
                                    !utils.isEmptyObj(getFieldValue(['gasPrice', 'valueType'])) && getFieldValue(['gasPrice', 'valueType']) !== 'constant' ? 
                                        <Form.Item name={['gasPrice', 'gasPriceType']}>
                                            <Select placeholder="Select transaction position in tx mempool" style={{width: 470, textAlign: 'center'}}>
                                                <Option value={'fivePercent'}>Roughly in the top 5% in the tx mempool</Option>
                                                <Option value={'tenPercent'}>Roughly in the top 10% in the tx mempool</Option>
                                                <Option value={'twentyPercent'}>Roughly in the top 20% in the tx mempool</Option>
                                            </Select>
                                        </Form.Item>
                                        : 
                                        <Form.Item 
                                            name={['gasPrice', 'maxFeePerGas']}
                                            rules={[{ required: true, message: 'Please input the max fee per gas of this tx!' }]}
                                        > 
                                            <InputNumber min={0} addonAfter='Gwei' style={{width: 470, textAlign: 'center'}}/>
                                        </Form.Item>
                                }
                                </Form.Item>
                            </Input.Group>
                        </Form.Item>

                        <Form.Item 
                            name="value" 
                            label="value"
                            rules={[{ required: true, message: 'Please input the value of this tx!' }]}
                        >                            
                            <InputNumber min={0} addonAfter='ETH' style={{width: 470, textAlign: 'center'}}/>
                        </Form.Item>

                        <Form.Item 
                            name="repeaTimes" 
                            label="repeat times"
                            rules={[{ required: true, message: 'Please input the repeat times of this tx!' }]}
                        >                            
                            <InputNumber min={1} style={{width: 470, textAlign: 'center'}}/>
                        </Form.Item>

                        {
                            repeaTimes > 1 ? 
                                <Form.Item 
                                    name="repeatCondition" 
                                    label="repeat condition"
                                    rules={[{ required: true, message: 'Please input the repeat condition of this tx!' }]}
                                >                            
                                    <Select style={{width: 470, textAlign: 'center'}}>
                                        <Option value={'sentSuccess'}>sent successful</Option>
                                        <Option value={'blockedSuccess'}>executed/blocked successful</Option>
                                    </Select>
                                </Form.Item>
                            :
                            null
                        }
                        
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