import React, { memo, useState, useEffect } from 'react';
import { Collapse, Typography, Space, Form, Button, Input, Modal, Select, Tooltip, InputNumber, Card, Divider, DatePicker } from 'antd';
import { PlusCircleOutlined, SyncOutlined, EditOutlined, ExclamationCircleOutlined, CheckCircleOutlined, QuestionCircleOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { ethers } from 'ethers';
import { Link } from "react-router-dom";
import moment from "moment";
import Web3 from 'web3';
import {SortableContainer, SortableElement} from 'react-sortable-hoc';
import {arrayMoveImmutable} from 'array-move';
import * as utils from '../../utils/utils';
import Converter from './Converter';
import BinanceSymbols from './asset/BinanceAssetList.json';

import { AvaxLogo, PolygonLogo, BSCLogo, ETHLogo } from "./Logos";
import assert from 'assert';
import './CreateScript.css';

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
    var scripts = global.localStorage.getItem('scriptList');
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
    const [eventConfig, setEventConfig] = useState({});
    const [txMonitorConfig, setTxMonitorConfig] = useState({});
    const [functionSelectedConfig, setFunctionSelectedConfig] = useState({});
    const [dependencyConfig, setDependencyConfig] = useState({});
    const [leftConfig, setLeftConfig] = useState({});
    const [tgMsgConfig, setTgMsgConfig] = useState({});
    const [clearResultConfig, setClearResultConfig] = useState({});
    const [modalTitle, setModalTitle] = useState('');
    const [currentScriptType, setCurrentScriptType] = useState('');
    const [addEventMonitorVisible, setAddEventMonitorVisible] = useState(false);
    const [addTxMonitorVisible, setAddTxMonitorVisible] = useState(false);
    const [selectFunctionInContractVisible, setSelectFunctionInContractVisible] = useState(false);
    const [newChainVisible, setNewChainVisible] = useState(false);
    const [sendTGMsgVisible, setSendTGMsgVisible] = useState(false);
    const [clearResultVisible, setClearResultVisible] = useState(false);
    const [importABIVisible, setImportABIVisible] = useState(false);
    const [leftConfigVisible, setLeftConfigVisible] = useState(false);
    const [dependencyConfigVisible, setDependencyConfigVisible] = useState(false);
    const [curStep, SetCurStep] = useState(1);
    const [totalStep, SetTotalStep] = useState(0);
    const [dependencyLength, setDependencyLength] = useState(0);
    const [initialValuesOfChainContract, setInitialValuesOfChainContract] = useState({});
    const [initialValuesOfEvent, setInitialValuesOfEvent] = useState({});
    const [initialValuesOfTxMonitor, setInitialValuesOfTxMonitor] = useState({});
    const [initialValuesOfFunctionSelected, setInitialValuesOfFunctionSelected] = useState({});
    const [initialValuesOfDependency, setInitialValuesOfDependency] = useState({});
    const [initialValuesOfLeftConfig, setInitialValuesOfLeftConfig] = useState({});
    const [initialValuesOfTgMsgConfig, setInitialValuesOfTgMsgConfig] = useState({});
    const [initialValuesOfClearResult, setInitialValuesOfClearResult] = useState({});
    const [modifyScript, setModifyScript] = useState(false);
    const [curModifiedTitle, setCurModifiedTitle] = useState('');
    const [curScriptTitle, setCurScriptTitle] = useState(script.title);
    const [scriptTitles, setScriptTitles] = useState(tmpScript.executionOrder == null ? [] : tmpScript.executionOrder);
    
    const logoMap = {1: <ETHLogo />, 43113: <AvaxLogo />, 137: <PolygonLogo />, 56: <BSCLogo />}

    const [chainContractForm] = Form.useForm();
    const [eventMonitorForm] = Form.useForm();
    const [pendingTxMonitorForm] = Form.useForm();
    const [addNewChainForm] = Form.useForm();
    const [functionSelectedForm] = Form.useForm();
    const [dependencyConfigForm] = Form.useForm();
    const [leftConfigForm] = Form.useForm();

    const [sendTGMsgForm] = Form.useForm();
    const [clearResultForm] = Form.useForm();

    var importedABI = '';
    const converter = new Converter(script);

    const contractAddr = Form.useWatch('contractAddr', chainContractForm);
    const currentChain = Form.useWatch('chain', chainContractForm);
    const fromValueType = Form.useWatch(['from', 'valueType'], chainContractForm);
    const fromStep = Form.useWatch(['from', 'step'], chainContractForm);

    const pendingTxFunction = Form.useWatch('function', pendingTxMonitorForm);
    const readDataFunction = Form.useWatch('function', functionSelectedForm);
    const repeaTimes = Form.useWatch('repeaTimes', leftConfigForm);

    useEffect(() => {
        chainContractForm.resetFields();
        eventMonitorForm.resetFields();
        pendingTxMonitorForm.resetFields();
        functionSelectedForm.resetFields();
        dependencyConfigForm.resetFields();
        sendTGMsgForm.resetFields();
        leftConfigForm.resetFields();
        clearResultForm.resetFields();
    }, [initialValuesOfChainContract, 
        initialValuesOfEvent, 
        initialValuesOfTxMonitor, 
        initialValuesOfFunctionSelected,
        initialValuesOfDependency,
        initialValuesOfLeftConfig,
        initialValuesOfTgMsgConfig,
        initialValuesOfClearResult]);

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
                    var randomTitle = 'script-' + Math.floor(100000 * (Math.random() + 1));
                    while(scripts[randomTitle] != null) randomTitle = 'script-' + Math.floor(100000 * (Math.random() + 1));
                    script.title =  randomTitle;
                    setCurScriptTitle(randomTitle);
                }
            }
            script.createdTime = new Date().getTime();
            scripts[script.title] = script;
            localStorage.setItem('scriptList', JSON.stringify(scripts));
            localStorage.removeItem('tmpScript');
        }
    });

    const SortableItem = SortableElement((initObj) => {
            initObj = JSON.parse(initObj.value);
            return <Card title={initObj.value} style={{ width: 400}}>
                    execution order: {initObj.index}
                    </Card>
        });

    const SortableList = SortableContainer(({items}) => {
        return (
            <div className="container">
            {items.map((value, index) => (
                <SortableItem key={`item-${value}`} index={index} value={JSON.stringify({value, index})} />
            ))}
            </div>
        );
    });

    const onSortEnd = ({oldIndex, newIndex}) => {
        const items = arrayMoveImmutable(scriptTitles, oldIndex, newIndex);
        setScriptTitles(items);
        script.executionOrder = items;
    };

    const updateScript = (currentValues) => {
        if (modifyScript && chainContractConfig.title != curModifiedTitle) {
            delete script['subScripts'][curModifiedTitle];
        }
        if (script['subScripts'] == null) {
            script['subScripts'] = {};
        }
        if (currentScriptType == 'event') {
            script['subScripts'][chainContractConfig.title] = {type: currentScriptType, chainContractConfig, eventConfig: currentValues}
        } else if (currentScriptType == 'pendingTx' || currentScriptType == 'executedTx') {
            script['subScripts'][chainContractConfig.title] = {type: currentScriptType, chainContractConfig, txMonitorConfig: currentValues}
        } else if (currentScriptType == 'rFunc') {
            script['subScripts'][chainContractConfig.title] = {type: currentScriptType, chainContractConfig, functionSelectedConfig, dependencyConfig: currentValues}
        } else if (currentScriptType == 'wFunc') {
            script['subScripts'][chainContractConfig.title] = {type: currentScriptType, chainContractConfig, functionSelectedConfig, dependencyConfig, leftConfig: currentValues}
        } else if (currentScriptType == 'tgMsg') {
            script['subScripts'][tgMsgConfig.title] = {type: currentScriptType, tgMsgConfig, dependencyConfig: currentValues}
        } else if (currentScriptType == 'clearResult') {
            script['subScripts'][clearResultConfig.title] = {type: currentScriptType, clearResultConfig, dependencyConfig: currentValues}
        }
        console.log(script);

        updateSubScriptTitles();
    }

    const clearInitialValues = () => {
        setInitialValuesOfChainContract({});
        setInitialValuesOfEvent({});
        setInitialValuesOfFunctionSelected({});
        setInitialValuesOfTxMonitor({});
        setInitialValuesOfDependency({});
        setInitialValuesOfLeftConfig({});
        setTgMsgConfig({});
        setClearResultConfig({});
    }

    const getSubScripts = () => {
        return script['subScripts'] == null ? {} : script['subScripts'];
    }

    const updateSubScriptTitles = () => {
        let titles = Object.entries(getSubScripts()).map(entry => {
                const subScript = entry[1];   
                if (subScript.type != 'event' && subScript.type != 'pendingTx' && subScript.type != 'executedTx')
                    return entry[0];
            }  
        ).filter(item => item != null);
        const newTitles = titles.filter(title => !scriptTitles.includes(title));
        titles = scriptTitles.filter(title => titles.includes(title)).concat(newTitles);
        setScriptTitles(titles);
        script.executionOrder = titles;
    }

    const getSubScript = (subScriptTitle) => {
        if (script['subScripts'] == null || script['subScripts'][subScriptTitle] == null)
            return null;
        return converter.convertSubScript(script['subScripts'][subScriptTitle]);
    }
    
    const handleChainContractOk = () => {
        chainContractForm.validateFields()
            .then(values => {
                console.log(values);
                setChainContractConfig(values);
                setConfigChainContractVisible(false);
                if (currentScriptType == 'event') {
                    SetCurStep(curStep + 1);
                    setAddEventMonitorVisible(true);
                    if (modifyScript) {
                        const initValues = JSON.parse(JSON.stringify(initialValuesOfEvent));
                        setInitialValuesOfEvent(initValues);
                    }
                } else if (currentScriptType == 'pendingTx' || currentScriptType == 'executedTx') {
                    SetCurStep(curStep + 1);
                    setAddTxMonitorVisible(true);
                    if (modifyScript) {
                        const initValues = JSON.parse(JSON.stringify(initialValuesOfTxMonitor));
                        setInitialValuesOfEvent(initValues);
                    }
                } else if (currentScriptType == 'rFunc' || currentScriptType == 'wFunc') {
                    SetCurStep(curStep + 1);
                    setSelectFunctionInContractVisible(true);
                    if (modifyScript) {
                        const initValues = JSON.parse(JSON.stringify(initialValuesOfFunctionSelected));
                        setInitialValuesOfEvent(initValues);
                    }
                }
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    }

    const handleEventMonitorOk = () => {
        eventMonitorForm.validateFields()
            .then(values => {
                console.log(values);
                setEventConfig(values);
                updateScript(values);
                setAddEventMonitorVisible(false);
                eventMonitorForm.resetFields();
                chainContractForm.resetFields();
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    }

    const handleTxMonitorOk = () => {
        pendingTxMonitorForm.validateFields()
            .then(values => {
                console.log('tx monitored data', values);
                setTxMonitorConfig(values);
                updateScript(values);
                pendingTxMonitorForm.resetFields();
                chainContractForm.resetFields();
                setAddTxMonitorVisible(false);
            })
            .catch(info => {
                console.log('Validate Failed:', info);
            });
    }

    const handleSelectFunctionOk = () => {
        functionSelectedForm.validateFields()
            .then(values => {
                console.log('function data', values);
                
                setFunctionSelectedConfig(values);
                setSelectFunctionInContractVisible(false); 
                setDependencyConfigVisible(true);
                SetCurStep(curStep + 1);

                if (modifyScript) {
                    const initValues = JSON.parse(JSON.stringify(initialValuesOfDependency));
                    setInitialValuesOfEvent(initValues);
                }
            })
    }

    const handleDependencyConfigOK = () => {        
        dependencyConfigForm.validateFields().then(values => {
            console.log('dependency data', values);
            setDependencyConfig(values);
            if (currentScriptType == 'wFunc') {
                setDependencyConfigVisible(false); 
                SetCurStep(curStep + 1);
                setLeftConfigVisible(true);
                if (modifyScript) {
                    const initValues = JSON.parse(JSON.stringify(initialValuesOfLeftConfig));
                    setInitialValuesOfEvent(initValues);
                }
            } else {
                setDependencyConfigVisible(false); 
                updateScript(values);
            }
        });
    }

    const handleLeftConfigOk = () => {
        leftConfigForm.validateFields()
            .then(values => {
                console.log('left config data', values);
                setLeftConfig(values);
                updateScript(values);
                setLeftConfigVisible(false);                
            });
    }

    const handleTGMsgOk = () => {
        sendTGMsgForm.validateFields()
            .then(values => {
                console.log('tg message', values);
                setTgMsgConfig(values);
                SetCurStep(curStep + 1);
                setDependencyConfigVisible(true);
                setSendTGMsgVisible(false);                
            });
    }

    const handleClearResultOk = () => {
        clearResultForm.validateFields()
            .then(values => {
                console.log('clear result message', values);
                setClearResultConfig(values);
                SetCurStep(curStep + 1);
                setDependencyConfigVisible(true);
                setClearResultVisible(false);                
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
            return Promise.reject(new Error('Title can NOT use keywords: timer, blockNumber, gasPrice, cexPrice, customScript.'));
        else if (getSubScript(value) == null || (modifyScript && value == curModifiedTitle))
            return Promise.resolve();
        else 
            return Promise.reject(new Error('Title can NOT be duplicated.'));
    }

    const openStepEditor = (scriptType, modalTitle, stepNumber) => {
        setCurrentScriptType(scriptType);
        setModalTitle(modalTitle);
        if (scriptType == 'tgMsg') {
            setSendTGMsgVisible(true);
        } else if (scriptType == 'clearResult') {
            setClearResultVisible(true);
        } else {
           setConfigChainContractVisible(true);
        }
        SetCurStep(1);
        SetTotalStep(stepNumber);
    }

    const addScript = (scriptType, modalTitle, stepNumber) => {
        setModifyScript(false);
        clearInitialValues();
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
        if (stepType == 'tgMsg') {
            return 'Telegram Message';
        }
    }

    const deleteSubScript = (subScriptTitle) => {
        delete script['subScripts'][subScriptTitle];
        const tmpScript = JSON.parse(JSON.stringify(script));
        setScript(tmpScript);
        updateSubScriptTitles();
    }

    const modifyStep = (subScriptTitle) => {
        var subScripts = script.subScripts;
        if (subScripts != null) {
            setModifyScript(true);
            setCurModifiedTitle(subScriptTitle);
            const subScript = subScripts[subScriptTitle];
            const stepType = subScript.type;
            if (stepType == 'event') {
                setInitialValuesOfChainContract(subScript['chainContractConfig']);
                setInitialValuesOfEvent(subScript['eventConfig']);
                openStepEditor('event', 'Event Config', 2);
            }
            if (stepType == 'pendingTx') {
                setInitialValuesOfChainContract(subScript['chainContractConfig']);
                setInitialValuesOfTxMonitor(subScript['txMonitorConfig']);
                openStepEditor('pendingTx', 'Transaction Config(in mempool)', 2);
            }
            if (stepType == 'executedTx') {
                setInitialValuesOfChainContract(subScript['chainContractConfig']);
                setInitialValuesOfTxMonitor(subScript['txMonitorConfig']);
                openStepEditor('executedTx', 'Transaction Config(in latest block)', 2);
            }
            if (stepType == 'rFunc') {
                setInitialValuesOfChainContract(subScript['chainContractConfig']);
                setInitialValuesOfFunctionSelected(subScript['functionSelectedConfig']);
                setInitialValuesOfDependency(subScript['dependencyConfig']);
                openStepEditor('rFunc', 'Read Contract Data Config', 3);
            }
            if (stepType == 'wFunc') {
                setInitialValuesOfChainContract(subScript['chainContractConfig']);
                setInitialValuesOfFunctionSelected(subScript['functionSelectedConfig']);
                setInitialValuesOfDependency(subScript['dependencyConfig']);
                setInitialValuesOfLeftConfig(subScript['leftConfig']);
                openStepEditor('wFunc', 'Send Transaction Config', 4);
            }
            if (stepType == 'tgMsg') {
                setInitialValuesOfTgMsgConfig(subScript['tgMsgConfig']);
                setInitialValuesOfDependency(subScript['dependencyConfig']);
                openStepEditor('tgMsg', 'Send Telegram Message', 2);
            }
            if (stepType == 'clearResult') {
                
            }
        }
        updateSubScriptTitles();
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
        var inputName = utils.isEmptyObj(input.name) ? '#' + index : input.name;
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
                                    Object.entries(getSubScripts()).map(entry => 
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
                                        isInputStep(getSubScript(getFieldValue([inputName, 'step']))) ?                                        
                                            getSubScript(getFieldValue([inputName, 'step'])).element.inputs.map((copyInput, index) => {
                                                const paraName = utils.isEmptyObj(copyInput.name) ? '#' + index : copyInput.name;
                                                if (isSameOrSimiliarType(input.type, copyInput.type))
                                                    return <Option value={paraName}>value of input parameter '{paraName}' in {getSubScript(getFieldValue([inputName, 'step'])).element.name}</Option>;
                                                }
                                            ) 
                                            :
                                            getSubScript(getFieldValue([inputName, 'step'])).element.outputs.map((copyOutput, index) => {
                                                const paraName = utils.isEmptyObj(copyOutput.name) ? '#' + index : copyOutput.name;
                                                if (isSameOrSimiliarType(input.type, copyOutput.type))
                                                    return <Option value={paraName}>value of output parameter '{paraName}' in {getSubScript(getFieldValue([inputName, 'step'])).element.name}</Option>;
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
        return dependencyName == 'timer' || dependencyName == 'blockNumber' || dependencyName == 'gasPrice' || dependencyName == 'cexPrice' || dependencyName == 'customScript';
    }

    const checkScript = async (path) => {
        sendTeleMsg2User(721373352, 'hello world, I am bot.');
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

    const convertString2Number = (gasPriceType) => {
        if (gasPriceType == 'fivePercent') return '5% in txpool';
        if (gasPriceType == 'tenPercent') return '10% in txpool';
        if (gasPriceType == 'twentyPercent') return '20% in txpool';
    }

    const sendTeleMsg2User = (chatId, message) => {        
        const telegramUrl = 'https://api.telegram.org/bot5529134860:AAFybUx2Ed2qoE85BaLwC5bhv2E0DcKWSC0/sendMessage?chat_id=' + chatId + '&text=' + message;
        fetch(telegramUrl, {}).then(resp => {
            resp.json().then(result => {
              console.log(result);
            });
          })
    }

    const getPriceFromBinance = (symbol) => {
        const binancePriceUrl = 'https://api.binance.com/api/v3/ticker/price?symbol=' + symbol + 'USDT';
        fetch(binancePriceUrl, {}).then(resp => {
            resp.json().then(result => {
              console.log(result);
            });
          })
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
                <Input type='text' style={{width: 800}} showCount maxLength={100} value={curScriptTitle} onChange={e => setCurScriptTitle(e.target.value)}/>
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
                            Object.entries(getSubScripts()).map(entry => {
                                const subScript = converter.convertSubScript(entry[1]);
                                if (subScript.type != 'event' && subScript.type != 'pendingTx' && subScript.type != 'executedTx') return;
                                const externalInfo = [];
                                var interfaceType = '';
                                if (subScript.type == 'event') {
                                    interfaceType = 'event';
                                    if (!utils.isEmptyObj(subScript.filter))
                                        externalInfo.push(<p><Text strong>filter:</Text> <Text code>{subScript.filter}</Text></p>);
                                } else if (subScript.type == 'pendingTx' || subScript.type == 'executedTx') {
                                    interfaceType = 'function';
                                    if (subScript.valueCondition != null) {
                                        externalInfo.push(<p><Text strong>msg.value:</Text> <Text code>{subScript.valueCondition.op} {subScript.valueCondition.value} ETH</Text></p>);
                                    }
                                    var paraCondition = '';
                                    for (const [parameter, condition] of Object.entries(subScript.parameterCondition)) {
                                        paraCondition += parameter + ' ' + condition.op + ' ' + condition.value + ' && ';
                                    }
                                        
                                    if (paraCondition.length > 0) {
                                        externalInfo.push(<p><Text strong>parameter condition:</Text><Text code>{paraCondition.substr(0, paraCondition.length - ' && '.length)}</Text></p>);
                                    }
                                }
                                return <Card title={subScript.title} style={{ width: 400 }}>
                                    <p><Text strong>Action:</Text> <Text keyboard>{getReadableType(subScript.type)}</Text></p>
                                    <p><Text strong>Chain:</Text> <Text keyboard>{evmChainIds[subScript.chainId]}(chainId = {subScript.chainId})</Text></p>
                                    <p><Text strong>Contract:</Text> <Text code>{subScript.to}</Text></p>
                                    <p><Text strong>{interfaceType}:</Text> <Text code>{subScript.name}</Text></p>
                                    {
                                        externalInfo
                                    }
                                    <Divider plain>
                                        <Space size='large'>
                                            <Button type='primary' onClick={() => deleteSubScript(subScript.title)}>Delete</Button>
                                            <Button type='primary' onClick={() => modifyStep(subScript.title)}>Modify</Button>
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
                        <Button type='primary' onClick={() => addScript('rWeb2', 'Read Web2 Data')}>Read Web2 Data</Button>
                    </Space><p/>
                    <Space wrap>
                        {
                            Object.entries(getSubScripts()).map(entry => {
                                const subScript = converter.convertSubScript(entry[1]);
                                //console.log(subScript);
                                if (subScript.type != 'rFunc' && subScript.type != 'rCex' && subScript.type != 'web2') return;
                                const externalInfo = [];
                                var interfaceType = '';
                                if (subScript.type == 'rFunc') {
                                    interfaceType = 'function';
                                    
                                    if (subScript.from instanceof String) {
                                        externalInfo.push(<p><Text strong>msg.sender:</Text> <Text code>{subScript.from}</Text></p>);
                                    } else {
                                        if (subScript.from.referenceType == 1) {
                                            externalInfo.push(<p><Text strong>msg.sender:</Text> <Text code>msg.sender@{subScript.from.step}</Text></p>);
                                        } else if (subScript.from.referenceType == 2) {
                                            externalInfo.push(<p><Text strong>msg.sender:</Text> <Text code>to@{subScript.from.step}</Text></p>);
                                        }  else if (subScript.from.referenceType == 5) {
                                            externalInfo.push(<p><Text strong>msg.sender:</Text> <Text code>{subScript.from.address}@{subScript.from.step}</Text></p>);
                                        } 
                                    }
                                    var paraCondition = '';
                                    subScript.parameters.map(parameter => {
                                        if (utils.isEmptyObj(parameter.step)) {
                                            paraCondition += parameter.paraName + ' = ' + parameter.value + ' && ';
                                        } else {
                                            paraCondition += parameter.paraName + ' = ' + parameter.referenceParaName + '@' + parameter.step + parameter.op + parameter.externalValue + ' && ';
                                        }
                                    })
                                        
                                    if (paraCondition.length > 0) {
                                        externalInfo.push(<p><Text strong>parameter condition:</Text><Text code>{paraCondition.substr(0, paraCondition.length - ' && '.length)}</Text></p>);
                                    }

                                    var dependencyCondition = '';
                                    if (subScript.conditions.length > 0) {
                                        var logicSymbol = subScript.logic == "and" ? '&&' : '||';
                                        subScript.conditions.map((condition, index) => {
                                            if (index > 0) dependencyCondition += ' ' + logicSymbol + ' ';
                                            if (isInternalDependency(condition.step)) {
                                                if (condition.step == 'cexPrice') {
                                                    dependencyCondition += 'Price of ' + condition.tokenSymbol + ' on Binance ' + condition.compareType + ' ' + condition.compareValue;
                                                } else
                                                    dependencyCondition += condition.step + ' ' + condition.compareType + ' ' + condition.compareValue;
                                            } else {
                                                dependencyCondition += condition.paraName + '@' + condition.step + ' ' + condition.compareType + ' ' + condition.compareValue;
                                            }
                                        })
                                    }

                                    if (dependencyCondition.length > 0) {
                                        externalInfo.push(<p><Text strong>dependent condition:</Text><Text code>{dependencyCondition}</Text></p>);
                                    }

                                    var delayedTime = utils.isEmptyObj(subScript.delayedTime) ? 'instant' : subScript.delayedTime + ' s';
                                    externalInfo.push(<p><Text strong>delayed time:</Text><Text code>{delayedTime}</Text></p>);

                                } else if (subScript.type == 'rCex') {
                                    interfaceType = 'coin';
                                } else if (subScript.type == 'web2') {

                                }
                                return <Card title={subScript.title} style={{ width: 'auto' }}>
                                    <p><Text strong>Action:</Text> <Text keyboard>{getReadableType(subScript.type)}</Text></p>
                                    <p><Text strong>Chain:</Text> <Text keyboard>{evmChainIds[subScript.chainId]}(chainId = {subScript.chainId})</Text></p>
                                    <p><Text strong>Contract:</Text> <Text code>{subScript.to}</Text></p>
                                    <p><Text strong>From Address:</Text> <Text code>{subScript.to}</Text></p>
                                    <p><Text strong>{interfaceType}:</Text> <Text code>{subScript.name}</Text></p>
                                    {
                                        externalInfo
                                    }
                                    <Divider plain>
                                        <Space size='large'>
                                            <Button type='primary' onClick={() => deleteSubScript(subScript.title)}>Delete</Button>
                                            <Button type='primary' onClick={() => modifyStep(subScript.title)}>Modify</Button>
                                        </Space>
                                    </Divider>
                                </Card>
                                }
                            )
                        }
                    </Space>
                </Panel>
                <Panel header={'Send transaction'}>
                    <Space>
                        <Button type='primary' onClick={() => addScript('wFunc', 'Send Transaction Config', 4)}>Send transaction</Button>
                    </Space>
                    <p/>
                    <Space wrap>
                        {
                            Object.entries(getSubScripts()).map(entry => {
                                const subScript = converter.convertSubScript(entry[1]);
                                //console.log(subScript);
                                if (subScript.type != 'wFunc') return;
                                const externalInfo = [];
                                var interfaceType = 'function';
                                if (subScript.from instanceof String) {
                                    externalInfo.push(<p><Text strong>msg.sender:</Text> <Text code>{subScript.from}</Text></p>);
                                } else {
                                    if (subScript.from.referenceType == 1) {
                                        externalInfo.push(<p><Text strong>msg.sender:</Text> <Text code>msg.sender@{subScript.from.step}</Text></p>);
                                    } else if (subScript.from.referenceType == 2) {
                                        externalInfo.push(<p><Text strong>msg.sender:</Text> <Text code>to@{subScript.from.step}</Text></p>);
                                    }  else if (subScript.from.referenceType == 5) {
                                        externalInfo.push(<p><Text strong>msg.sender:</Text> <Text code>{subScript.from.address}@{subScript.from.step}</Text></p>);
                                    } 
                                }
                                var paraCondition = '';
                                subScript.parameters.map(parameter => {
                                    if (utils.isEmptyObj(parameter.step)) {
                                        paraCondition += parameter.paraName + ' = ' + parameter.value + ' && ';
                                    } else {
                                        paraCondition += parameter.paraName + ' = ' + parameter.referenceParaName + '@' + parameter.step + parameter.op + parameter.externalValue + ' && ';
                                    }
                                })
                                    
                                if (paraCondition.length > 0) {
                                    externalInfo.push(<p><Text strong>parameter condition:</Text><Text code>{paraCondition.substr(0, paraCondition.length - ' && '.length)}</Text></p>);
                                }

                                var dependencyCondition = '';
                                if (subScript.conditions.length > 0) {
                                    var logicSymbol = subScript.logic == "and" ? '&&' : '||';
                                    subScript.conditions.map((condition, index) => {
                                        if (index > 0) dependencyCondition += ' ' + logicSymbol + ' ';
                                        if (isInternalDependency(condition.step)) {
                                            dependencyCondition += condition.step + ' ' + condition.compareType + ' ' + condition.compareValue;
                                        } else {
                                            dependencyCondition += condition.paraName + '@' + condition.step + ' ' + condition.compareType + ' ' + condition.compareValue;
                                        }
                                    })
                                }

                                if (dependencyCondition.length > 0) {
                                    externalInfo.push(<p><Text strong>dependent condition:</Text><Text code>{dependencyCondition}</Text></p>);
                                }

                                var delayedTime = utils.isEmptyObj(subScript.delayedTime) ? 'instant' : subScript.delayedTime + ' s';
                                externalInfo.push(<p><Text strong>delayed time:</Text><Text code>{delayedTime}</Text></p>);

                                if (subScript.repeaTimes > 0) {
                                    externalInfo.push(<p><Text strong>repeat times:</Text><Text code>{subScript.repeaTimes}</Text></p>);
                                    externalInfo.push(<p><Text strong>repeat condition:</Text><Text code>{subScript.repeatCondition == 'sentSuccess' ? 'sent successfully' : 'executed successfully'}</Text></p>);
                                }

                                return <Card title={subScript.title} style={{ width: 'auto' }}>
                                    <p><Text strong>Action:</Text> <Text keyboard>{getReadableType(subScript.type)}</Text></p>
                                    <p><Text strong>Chain:</Text> <Text keyboard>{evmChainIds[subScript.chainId]}(chainId = {subScript.chainId})</Text></p>
                                    <p><Text strong>Contract:</Text> <Text code>{subScript.to}</Text></p>
                                    <p><Text strong>From Address:</Text> <Text code>{subScript.to}</Text></p>
                                    <p><Text strong>Value of ETH:</Text> <Text code>{subScript.value} ETH</Text></p>
                                    <p><Text strong>Gas Price:</Text> <Text code>{subScript.gasPriceValueType == 'dynamic' ? convertString2Number(subScript.gasPriceType) : subScript.maxFeePerGas + 'Gwei'}</Text></p>
                                    <p><Text strong>{interfaceType}:</Text> <Text code>{subScript.name}</Text></p>
                                    {
                                        externalInfo
                                    }
                                    <Divider plain>
                                        <Space size='large'>
                                            <Button type='primary' onClick={() => deleteSubScript(subScript.title)}>Delete</Button>
                                            <Button type='primary' onClick={() => modifyStep(subScript.title)}>Modify</Button>
                                        </Space>
                                    </Divider>
                                </Card>
                                }
                            )
                        }
                    </Space>
                </Panel>
                <Panel header={'Send Telegram Message / Record information to DB'}>
                    <Space>
                        <Button type='primary' onClick={() => addScript('tgMsg', 'Send Telegram Message', 2)}>Send Telegram Message</Button>
                        <Button type='primary'>Record information</Button>
                    </Space>
                    <p/>
                    <Space wrap>
                        {
                            Object.entries(getSubScripts()).map(entry => {
                                const subScript = converter.convertSubScript(entry[1]);
                                //console.log(subScript);
                                if (subScript.type != 'tgMsg' && subScript.type != 'wWeb2') return;
                                const externalInfo = [];
                                var interfaceType = '';
                                if (subScript.type == 'tgMsg') {
                                   
                                    var dependencyCondition = '';
                                    if (subScript.conditions.length > 0) {
                                        var logicSymbol = subScript.logic == "and" ? '&&' : '||';
                                        subScript.conditions.map((condition, index) => {
                                            if (index > 0) dependencyCondition += ' ' + logicSymbol + ' ';
                                            if (isInternalDependency(condition.step)) {
                                                if (condition.step == 'cexPrice') {
                                                    dependencyCondition += 'Price of ' + condition.tokenSymbol + ' on Binance ' + condition.compareType + ' ' + condition.compareValue;
                                                } else
                                                    dependencyCondition += condition.step + ' ' + condition.compareType + ' ' + condition.compareValue;
                                            } else {
                                                dependencyCondition += condition.paraName + '@' + condition.step + ' ' + condition.compareType + ' ' + condition.compareValue;
                                            }
                                        })
                                    }

                                    if (dependencyCondition.length > 0) {
                                        externalInfo.push(<p><Text strong>dependent condition:</Text><Text code>{dependencyCondition}</Text></p>);
                                    }

                                    var delayedTime = utils.isEmptyObj(subScript.delayedTime) ? 'instant' : subScript.delayedTime + ' s';
                                    externalInfo.push(<p><Text strong>delayed time:</Text><Text code>{delayedTime}</Text></p>);

                                } else if (subScript.type == 'wWeb2') {
                                    interfaceType = 'coin';
                                }
                                return <Card title={subScript.title} style={{ width: 'auto' }}>
                                    <p><Text strong>Action:</Text> <Text keyboard>{getReadableType(subScript.type)}</Text></p>
                                    <p><Text strong>User Id:</Text> <Text keyboard>{subScript.toUserId}</Text></p>
                                    <p><Text strong>Message:</Text> <Text code>{subScript.message}</Text></p>
                                    {
                                        externalInfo
                                    }
                                    <Divider plain>
                                        <Space size='large'>
                                            <Button type='primary' onClick={() => deleteSubScript(subScript.title)}>Delete</Button>
                                            <Button type='primary' onClick={() => modifyStep(subScript.title)}>Modify</Button>
                                        </Space>
                                    </Divider>
                                </Card>
                                }
                            )
                        }
                    </Space>                
                </Panel>
                <Panel header={'Clear result'}>
                    <Space>
                        <Button type='primary' onClick={() => addScript('clearResult', 'Clear the result of other subscripts', 2)}>Clear Result</Button>
                    </Space>
                    <p/>
                    <Space wrap>
                        {
                            Object.entries(getSubScripts()).map(entry => {
                                const subScript = converter.convertSubScript(entry[1]);
                                //console.log(subScript);
                                if (subScript.type != 'clearResult') return;
                                const externalInfo = [];
                                var interfaceType = '';
                                var dependencyCondition = '';
                                if (subScript.conditions.length > 0) {
                                    var logicSymbol = subScript.logic == "and" ? '&&' : '||';
                                    subScript.conditions.map((condition, index) => {
                                        if (index > 0) dependencyCondition += ' ' + logicSymbol + ' ';
                                        if (isInternalDependency(condition.step)) {
                                            if (condition.step == 'cexPrice') {
                                                dependencyCondition += 'Price of ' + condition.tokenSymbol + ' on Binance ' + condition.compareType + ' ' + condition.compareValue;
                                            } else
                                                dependencyCondition += condition.step + ' ' + condition.compareType + ' ' + condition.compareValue;
                                        } else {
                                            dependencyCondition += condition.paraName + '@' + condition.step + ' ' + condition.compareType + ' ' + condition.compareValue;
                                        }
                                    })
                                }

                                if (dependencyCondition.length > 0) {
                                    externalInfo.push(<p><Text strong>dependent condition:</Text><Text code>{dependencyCondition}</Text></p>);
                                }

                                var delayedTime = utils.isEmptyObj(subScript.delayedTime) ? 'instant' : subScript.delayedTime + ' s';
                                externalInfo.push(<p><Text strong>delayed time:</Text><Text code>{delayedTime}</Text></p>);
                                return <Card title={subScript.title} style={{ width: 'auto' }}>
                                    <p><Text strong>Action:</Text> <Text keyboard>{getReadableType(subScript.type)}</Text></p>
                                    <p><Text strong>subscript title:</Text> <Text keyboard>{subScript.subscriptTitle}</Text></p>
                                    {
                                        externalInfo
                                    }
                                    <Divider plain>
                                        <Space size='large'>
                                            <Button type='primary' onClick={() => deleteSubScript(subScript.title)}>Delete</Button>
                                            <Button type='primary' onClick={() => modifyStep(subScript.title)}>Modify</Button>
                                        </Space>
                                    </Divider>
                                </Card>
                                }
                            )
                        }
                    </Space>  
                </Panel>
            </Collapse>
            <Typography>
                <Title>Some subscripts' execution order (Adjustable by drag and drop)</Title>
                <SortableList items={scriptTitles} onSortEnd={onSortEnd} />
            </Typography>
            
            <Modal
                visible={configChainContractVisible}
                title={modalTitle + ' ' + curStep + '/' + totalStep}
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
                    initialValues={initialValuesOfChainContract}
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
                                                        Object.entries(getSubScripts()).map(entry => 
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
                                            getSubScript(fromStep) != null ?
                                                <Form.Item
                                                    name={['from', 'address']}
                                                    noStyle
                                                    rules={[{ required: true, message: 'Please select the address source!' }]}
                                                >
                                                    <Select placeholder="Select address source" style={{width: 470, textAlign: 'center'}}>
                                                        {
                                                            (getSubScript(fromStep).element.type == 'event' || !getSubScript(fromStep).element.constant) ?  // 事件和write交易需要从inputs里读取数据，而view接口从outputs里读数据
                                                            getSubScript(fromStep).element.inputs.map(input => {
                                                                if (input.type == 'address') {
                                                                    return <Option value={input.name}>value of input parameter '{input.name}' in {getSubScript(fromStep).element.name}</Option>;
                                                                }
                                                            })
                                                            :
                                                            getSubScript(fromStep).element.outputs.map(output => {
                                                                if (output.type == 'address') {
                                                                    return <Option value={output.name}>value of output parameter '{output.name}' in {getSubScript(fromStep).element.name}</Option>;
                                                                }
                                                            })
                                                        }
                                                        {
                                                            getSubScript(fromStep).type == 'pendingTx' || getSubScript(fromStep).type == 'executedTx' ? 
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
                title={modalTitle + ' ' + curStep + '/' + totalStep}
                okText="Confirm"
                cancelText="Previous"
                onCancel={() => setAddEventMonitorVisible(false)}
                onOk={handleEventMonitorOk}
                footer={[
                    <Button key="back" onClick={() => {setAddEventMonitorVisible(false); setConfigChainContractVisible(true); SetCurStep(curStep - 1);}}>
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
                    initialValues={initialValuesOfEvent}
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
                                            
                                            return <Option key={JSON.stringify(element)} value={JSON.stringify(element)}>{element.name}({parameters})</Option>
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
                visible={addTxMonitorVisible}
                title={modalTitle + ' ' + curStep + '/' + totalStep}
                okText="Confirm"
                cancelText="Previous"
                onCancel={() => setAddTxMonitorVisible(false)}
                onOk={handleTxMonitorOk}
                footer={[
                    <Button key="back" onClick={() => {setAddTxMonitorVisible(false); setConfigChainContractVisible(true); SetCurStep(curStep - 1);}}>
                      Previous
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleTxMonitorOk}>
                      Confirm
                    </Button>
                  ]}
                >
                <Form
                    form={pendingTxMonitorForm}
                    layout="vertical"
                    name="form_in_modal"
                    initialValues={initialValuesOfTxMonitor}
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
                                            
                                            return <Option title={element.name + '(' + parameters + ')'} key={JSON.stringify(element)} value={JSON.stringify(element)}>{element.name}({parameters})</Option>
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
                title={modalTitle + ' ' + curStep + '/' + totalStep}
                okText="Confirm"
                cancelText="Previous"
                onCancel={() => setSelectFunctionInContractVisible(false)}
                onOk={handleSelectFunctionOk}
                footer={[
                    <Button key="back" onClick={() => {setSelectFunctionInContractVisible(false); setConfigChainContractVisible(true); SetCurStep(curStep - 1);}}>
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
                    initialValues={initialValuesOfFunctionSelected}
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
                title={modalTitle + ' ' + curStep + '/' + totalStep}
                okText="Confirm"
                cancelText="Previous"
                onCancel={() => setDependencyConfigVisible(false)}
                onOk={handleDependencyConfigOK}
                footer={[
                    <Button key="back" onClick={() => {
                        setDependencyConfigVisible(false);      
                        if (currentScriptType == 'tgMsg') {
                            setSendTGMsgVisible(true);
                        } else                
                            setSelectFunctionInContractVisible(true); 
                        SetCurStep(curStep - 1);
                    }}>
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
                    initialValues={initialValuesOfDependency}
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
                                                Object.entries(getSubScripts()).map(entry => 
                                                    <Option title={entry[0]} value={entry[0]}>{entry[0]}</Option>
                                                )
                                            }
                                            {
                                                [
                                                    <Option value={'timer'}>set condition of the timer</Option>,
                                                    <Option value={'blockNumber'}>set the condition of block height</Option>,
                                                    <Option value={'gasPrice'}>set the condition of gas price</Option>,
                                                    <Option value={'cexPrice'}>get price from CEX</Option>,
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
                                                || (getSubScript(stepName) != null && getSubScript(stepName).element.type == 'wFunc') ? 
                                                <div style={{display: 'none'}} /> 
                                                :
                                                <Select placeholder="Select input source" style={{width: 470, textAlign: 'center'}}>
                                                    {
                                                        (getSubScript(stepName).element.type == 'event' 
                                                        || !getSubScript(stepName).element.constant) ?  // 事件和write交易需要从inputs里读取数据，而view接口从outputs里读数据
                                                        getSubScript(stepName).element.inputs.map((input, index) => {
                                                            if (input.type == 'address') {
                                                                const paraName = utils.isEmptyObj(input.name) ? '#' + index : input.name;
                                                                return <Option value={paraName}>value of input parameter '{paraName}' in {getSubScript(stepName).element.name}</Option>;
                                                            }
                                                        })
                                                        :
                                                        getSubScript(stepName).element.outputs.map((output, index) => {
                                                            if (output.type == 'address') {
                                                                const paraName = utils.isEmptyObj(output.name) ? '#' + index : output.name;
                                                                return <Option value={paraName}>value of output parameter '{paraName}' in {getSubScript(stepName).element.name}</Option>;
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
                                            || (getSubScript(stepName) != null && getSubScript(stepName).element.type == 'wFunc') ? 
                                                <div style={{display: 'none'}}/> :
                                                (
                                                    <div style={{marginTop: -60}}>
                                                        {isInternalDependency(stepName) ? '' : 'The input value could be adjusted by followed option.'}
                                                        {
                                                            stepName == 'cexPrice' ? 
                                                            <Form.Item
                                                                name={[name, 'tokenSymbol']}
                                                                noStyle
                                                            >
                                                                <Select showSearch placeholder="Select token symbol" style={{width: 470, textAlign: 'center'}}
                                                                    filterOption={(input, option) =>
                                                                        option.children.toLowerCase().includes(input.toLowerCase())
                                                                    }>
                                                                {
                                                                    Object.entries(BinanceSymbols).map(entries => 
                                                                        <Option title={entries[0]} value={entries[0]}>{entries[0]}</Option>
                                                                    )
                                                                }
                                                                </Select>
                                                            </Form.Item>
                                                            :
                                                            null
                                                        }
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
                                                            shouldUpdate
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
                                                                stepName == 'cexPrice' ?
                                                                <InputNumber style={{width: 235}} placeholder='input token price' addonAfter={BinanceSymbols[dependencyConfigForm.getFieldValue(['dependency', name, 'tokenSymbol'])]}/>
                                                                :
                                                                stepName == 'customScript' ?
                                                                <Space>
                                                                    <Input.TextArea rows={6}  style={{width: 390}} placeholder='input js function which type of return value should be bool.eg: async function() {return true;}'/>
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
                title={modalTitle + ' ' + curStep + '/' + totalStep}
                okText="Confirm"
                cancelText="Previous"
                onCancel={() => setLeftConfigVisible(false)}
                onOk={handleLeftConfigOk}
                footer={[
                    <Button key="back" onClick={() => {setLeftConfigVisible(false); setDependencyConfigVisible(true); SetCurStep(curStep - 1);}}>
                      Previous
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleLeftConfigOk}>
                      Confirm
                    </Button>
                  ]}
                >
                    <Form
                        form={leftConfigForm}
                        layout="vertical"
                        name="form_in_modal"
                        initialValues={initialValuesOfLeftConfig}
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
                            label="repeat times after the first execution"
                            rules={[{ required: true, message: 'Please input the repeat times of this tx!' }]}
                        >                            
                            <InputNumber min={0} style={{width: 470, textAlign: 'center'}}/>
                        </Form.Item>

                        {
                            repeaTimes > 0 ? 
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
            <Modal
                visible={sendTGMsgVisible}
                title={modalTitle + " " + curStep + '/' + totalStep}
                okText="Next"
                cancelText="Cancel"
                onCancel={() => setSendTGMsgVisible(false)}
                onOk={handleTGMsgOk}
                footer={[
                    <Button key="back" onClick={() => setSendTGMsgVisible(false)}>
                      Cancel
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleTGMsgOk}>
                      Next
                    </Button>
                  ]}
                >
                    <Form
                        form={sendTGMsgForm}
                        layout="vertical"
                        name="form_in_modal"
                        initialValues={initialValuesOfTgMsgConfig}
                    >
                        <Form.Item 
                            name="title" 
                            label="title"
                            rules={[{ required: true, message: 'Please input the title!' }, {validator: checkTitle}]}
                        >                            
                            <Input type='text' style={{ width: 470 }}/>
                        </Form.Item>
                        <Form.Item 
                            name="toUserId" 
                            label="User ID"
                            rules={[{ required: true, message: 'Please input the user id!' }]}
                        >                            
                            <InputNumber min={1} style={{width: 235}}/>
                        </Form.Item>

                        <Form.Item 
                            name="message" 
                            label="Message"
                            rules={[{ required: true, message: 'Please input the message!' }]}
                        >                            
                            <Input type='text' style={{ width: 470 }}/>
                        </Form.Item>
                    </Form>
                </Modal>
            <Modal
                visible={clearResultVisible}
                title={modalTitle + " " + curStep + '/' + totalStep}
                okText="Next"
                cancelText="Cancel"
                onCancel={() => setClearResultVisible(false)}
                onOk={handleClearResultOk}
                footer={[
                    <Button key="back" onClick={() => setClearResultVisible(false)}>
                    Cancel
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleClearResultOk}>
                    Next
                    </Button>
                ]}
                >
                    <Form
                        form={clearResultForm}
                        layout="vertical"
                        name="form_in_modal"
                        initialValues={initialValuesOfClearResult}
                    >
                        <Form.Item 
                            name="title" 
                            label="title"
                            rules={[{ required: true, message: 'Please input the title!' }, {validator: checkTitle}]}
                        >                            
                            <Input type='text' style={{ width: 470 }}/>
                        </Form.Item>
                        <Form.Item 
                            name="subscript" 
                            label="subscript"
                            rules={[{ required: true, message: 'Please select the subscript which result will be cleared' }]}
                        >                            
                            <Select placeholder="Select subScript" style={{width: 470, textAlign: 'center'}}>
                                {
                                    Object.entries(getSubScripts()).map(entry => 
                                        <Option title={entry[0]} value={entry[0]}>{entry[0]}</Option>
                                    )
                                }
                            </Select>
                        </Form.Item>
                    </Form>
                </Modal>
        </div>
        ); 
}