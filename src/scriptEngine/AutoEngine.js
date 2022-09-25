import * as utils from '../../utils/utils';

const BigNumber = require('bignumber.js');
const Web3 = require('web3');

const ValueType = {from: 1, to: 2, value: 3, gasPrice: 4, parameter: 5}
const timeInterval = {1: 8}
/*
scriptConfig = {
    'abi': {
        1: {
            '0x...': []
        },
        2: {
            '0x...': []
        }
    },
    script: [

    ]
}

*/
class AutoEngine {
    constructor(scriptConfigInfo, networkCenter, wallet) {
        this.scriptConfig = scriptConfigInfo.script;
        this.contractAbi = scriptConfigInfo.abi;
        this.networkCenter = networkCenter;
        this.eventSubscribeObjList = [];
        this.wFuncGasMonitor = [];
        this.pendingTxStateMonitor = [];
        this.excutedTxStateMonitor = [];
        this.wallet = wallet;
        this.nonceRecord = {}
    }

    getNonce(account) {
        if (this.nonceRecord[account] == null) {
            throw 'account not exist';
        }
        const nonce = this.nonceRecord[account];
        this.nonceRecord[account]++;
        return nonce;
    }

    getAbi(chainId, contractAddr, name, signature) {
        const contractAbi = this.contractAbi[chainId][contractAddr];
        if (contractAbi == null) {
            throw contractAddr + '’s abi cant be found.';
        }
        const web3 = this.networkCenter.getWeb3(subStep.chainId);
        for (var i = 0; i < contractAbi.length; i++) {
            const interfaceAbi = contractAbi[i];
            if (interfaceAbi.type != 'function' || interfaceAbi.type != 'event') continue;
            const sig = interfaceAbi.type == 'function' ? web3.eth.abi.encodeFunctionSignature(interfaceAbi) : web3.eth.abi.encodeEventSignature(interfaceAbi);
            if (sig == signature) {
                return {interfaceAbi, inputs: interfaceAbi.inputs};
            }
        }
        throw name + ' can‘t be found in contract ABI.';
    }

    // 预处理脚本，譬如监听事件、交易等
    async preProcessScript() {
        const stepLength = this.scriptConfig.length;
        for (var i = 0; i < stepLength; i++) {
            const step = this.scriptConfig[i];
            if (step == null) {
                break;
            }
            for (var j = 0; j < step.length; j++) {
                const subStep = step[j];
                const type = subStep.type;
                if (!this.networkCenter.isValidChain(subStep.chainId)) {
                    throw '网络不支持:' + subStep.chainId;
                }
                const evmChain = this.networkCenter.getEVMChain(subStep.chainId);
                const abiInfo = utils.isEmptyObj(signature) ? {inputs: ''} : this.getAbi(subStep.chainId, subStep.to, subStep.name, subStep.signature);
                
                if (type == 'event') {
                    this.subscribeEvent(subStep);
                } else if (type == 'wFunc') {
                    const monitorId = evmChain.addGasMonitoredPendingTx(subStep.to, subStep.signature, '');
                    const web3 = this.networkCenter.getWeb3(subStep.chainId);
                    const txCount = await web3.eth.getTransactionCount(subStep.from);
                    this.nonceRecord[subStep.from] = txCount;
                    this.wFuncGasMonitor.push({evmChain, monitorId});
                } else if (type == 'pendingTx') {
                    const monitorId = evmChain.addStateMonitoredPendingTx(subStep.from, subStep.to, subStep.valueCondition, 
                                                        subStep.signature, abiInfo.inputs, subStep.parameterCondition, 
                                                        (transaction) => {
                                                            subStep.result = [transaction, ...subStep.result];
                                                        });
                    this.pendingTxStateMonitor.push({evmChain, monitorId});
                } else if (type == 'executedTx') {
                    const monitorId = evmChain.addStateMonitoredExcutedTx(subStep.from, subStep.to, subStep.valueCondition, 
                                                        subStep.signature, abiInfo.inputs, subStep.parameterCondition, 
                                                        (transaction) => {
                                                            subStep.result = [transaction, ...subStep.result];
                                                        });
                    this.excutedTxStateMonitor.push({evmChain, monitorId});
                } else if (type == 'rFunc' || type == 'clearResult') {
                    // don't need to preProcess
                } 
            }
        }
    }

    stopEngine() {
        this.eventSubscribeObjList.map(subscribeObj => {
            subscribeObj.unsubscribe();
        });
        this.wFuncGasMonitor.map(monitorInfo => {
            monitorInfo.evmChain.removeGasMonitoredPendingTx(monitorInfo.monitorId);
        });
        this.pendingTxStateMonitor.map(monitorInfo => {
            monitorInfo.evmChain.removeStateMonitoredPendingTx(monitorInfo.monitorId);
        });
        this.excutedTxStateMonitor.map(monitorInfo => {
            monitorInfo.evmChain.removeStateMonitoredExcutedTx(monitorInfo.monitorId);
        });

        this.eventSubscribeObjList = [];
        this.wFuncGasMonitor = [];
        this.pendingTxStateMonitor = [];
        this.excutedTxStateMonitor = [];
    }

    runScript() {
        const stepLength = this.scriptConfig.length;
        for (var i = 0; i < stepLength; i++) {
            const step = this.scriptConfig[i];
            if (step == null) {
                break;
            }
            const bPassed = this.runStep(step);
            if (!bPassed) {
                break;
            }
        }
    }

    runStep(step) {
        var bPassed = false;
        for (var i = 0; i < step.length; i++) {
            const subStep = step[i];
            const result = this.runSubStep(subStep);
            bPassed = bPassed || result;
        }
        return bPassed;
    }
    
    runSubStep(subStep) {
        const type = subStep.type;
        if (type == 'event') {
            // 在预处理阶段已经登记，此处无需处理
        } else if (type == 'rFunc') {
            this.readData(subStep);
        } else if (type == 'wFunc') {
            this.writeData(subStep);
        } else if (type == 'clearResult') {
            this.clearResult(subStep);
        } else if (type == 'pendingTx' || type == 'executedTx') {
            // 在预处理阶段已经登记，此处无需处理，因为这两种类型仅用于监控交易，其它类型的子脚本会使用这类交易的信息
        }
    }
    
    /*
        {
            'type': 'event',
            'chainId': 1,
            'contractAddr': '0x...',
            'name': 'interfaceName',
            'abi': {},
            'filter': {
                'para1': [
                    1, 2
                ]
            },
            'maxBlockInterval': 30,  // 最大区块间隔时间
            'result': [
                {
                    returnValues: {
                        myIndexedParam: 20,
                        myOtherIndexedParam: '0x123456789...',
                        myNonIndexParam: 'My String'
                    },
                    raw: {
                        data: '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385',
                        topics: ['0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7', '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385']
                    },
                    event: 'MyEvent',
                    signature: '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
                    logIndex: 0,
                    transactionIndex: 0,
                    transactionHash: '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385',
                    blockHash: '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
                    blockNumber: 1234,
                    address: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'
                }
            ]
        }
    */
   /*
    myContract.once(event[, options], callback) : https://web3js.readthedocs.io/en/v1.7.4/web3-eth-contract.html#once
    myContract.events.MyEvent([options][, callback]): https://web3js.readthedocs.io/en/v1.7.4/web3-eth-contract.html#contract-events
    myContract.getPastEvents(event[, options][, callback]) : https://web3js.readthedocs.io/en/v1.7.4/web3-eth-contract.html#getpastevents
   */
    /*
        事件只要及时记录下来即可，其它step会访问事件数据，做出相应动作
    */
    subscribeEvent(subStep) {        
        const web3 = this.networkCenter.getWeb3(subStep.chainId);
        const contractAbi = this.contractAbi[subStep.chainId][subStep.to];
        var contract = new web3.eth.Contract(contractAbi, subStep.to);
        //const eventKey = subStep.to + '-' + subStep.name;
        const contractSubObject = contract.events[subStep.name]({filter: subStep.filter, fromBlock: 'latest', topics: [subStep.signature]}, 
                                                                function(error, event) { console.log(event) });
        contractSubObject.on("connected", function(subscriptionId){
            console.log('new subscriptionId', subscriptionId);
        });
        contractSubObject.on('data', function(event) {
            subStep.result = [event, ...subStep.result];
            console.log(subStep.result);
        });
        contractSubObject.on('error', console.error);
        this.eventSubscribeObjList.push(contractSubObject);
    }
    
    /*
    'dependencies': {
        logic: 'and/or',
        conditions: [
          {
            'index': 0,
            'subIndex': 0,
            'dependentCondition': [  // 有多个值需要比较的时候，需要数组
              {  // event / rFunc
                'paraName': 'para1',  // 只能是返回值
                'paraIndex': 0,        // 当返回值没有名称的时候，用序号
                'compareType': 'eq/lt/gt/lte/gte/between/include/includedBy',
                'compareValue': 100000
              }
            ]
          },
          {
            'index': 2,
            'subIndex': 0,
            'dependentCondition': [{  // wFunc
              'status': 'receiptSuccess'
            }]
          }
        ]
    }
    */
    checkDependences(subStep) {        
        if (subStep.dependencies == null || subStep.dependencies.length == 0) return true;
        const checkDependentCondition = (dependence, dependentCondition) => {
            const subStep = this.scriptConfig[dependence.index][dependence.subIndex];
            for (var i = 0; i < dependentCondition.length; i++) {
                const condition = dependentCondition[i];
                if (subStep.type == 'event' || subStep.type == 'rFunc') {
                    var result = subStep.result.returnValues[condition.paraName];
                    if (result == null) 
                        result = subStep.result.returnValues[condition.paraIndex];
                    if (result == null) return false;
                    const expected = utils.aShouldOpB(result, condition.compareType, condition.compareValue);
                    if (!expected) return false;
                } else if (subStep.type == 'wFunc') {
                    if (condition.status != subStep.result.status) return false;
                } else if (subStep.type == 'pendingTx') {
                    if (subStep.result.length == 0) return false;
                } else if (subStep.type == 'executedTx') {
                    if (subStep.result.length == 0) return false;
                } else {
                    throw 'Not supported type:' + subStep.type + ' in dependency';
                }
            }
            return true;
        }
        const isAnd = subStep.dependencies.logic == 'and';
        for (var i = 0; i < subStep.dependencies.conditions.length; i++) {
            const dependence = subStep.dependencies.conditions[i];
            const dependentCondition = dependence.dependentCondition;
            const result = checkDependentCondition(dependence, dependentCondition);
            if (isAnd && !result) return false;
            if (!isAnd && result) return true;
        }
        return isAnd;
    }
    /*
    'parameters': [
          {  // 本地输入
            'paraName': 'para1',
            'value': 1
          },
          {  // 从事件中提取参数值
            'paraName': 'para2',
            'index': 1,
            'subIndex': 0,
            'referenceParaName': 'para1',
            'op': '+',
            'externalValue': 1
          },
          {  // 从只读接口中获取返回值作为参数值
            'index': 1,
            'subIndex': 0,
            'paraName': 'para3',
            'referenceParaName': 'para1',    // 只能是返回值
            'referenceParaIndex': 0，        // 当返回值没有名称的时候，用序号
            'op': '+',
            'externalValue': 1
          },
          {  // 从pendingtx/excutedTx中获取参数值
            'index': 1,
            'subIndex': 0,
            'paraName': 'para3',
            'referenceType': 'from',         // {from: 1, to: 1, value: 1, gasPrice: 1, parameter: 1}
            'referenceParaName': 'para1',    // 只能是返回值
            'referenceParaIndex': 0，        // 当返回值没有名称的时候，用序号
            'op': '+',
            'externalValue': 1
          }
        ],
    */
    prepareFuncInputValues(subStep) {
        const inputValues = [];
        subStep.parameters.forEach(parameter => {
            if (parameter.index == null || parameter.subIndex == null) {
                inputValues.push(parameter.value);
            } else {
                const subStep = this.scriptConfig[parameter.index][parameter.subIndex];
                if (subStep.type == 'event') {
                    var eventParaValue = this.getEventValue(subStep, parameter.referenceParaName);       
                    eventParaValue = parameter.op ? utils.aOpB(eventParaValue, parameter.op, parameter.externalValue) : eventParaValue;         
                    inputValues.push(eventParaValue);
                } else if (subStep.type == 'rFunc') {
                    var rFuncParaValue = this.getRFuncValue(subStep, parameter.referenceParaName, parameter.referenceParaIndex);    
                    rFuncParaValue = (parameter.op && parameter.externalValue) ? utils.aOpB(rFuncParaValue, parameter.op, parameter.externalValue) : rFuncParaValue;
                    inputValues.push(rFuncParaValue);
                } else if (subStep.type == 'pendingTx' || subStep.type == 'executedTx') {
                    var txValue = this.getTxValue(subStep, parameter.referenceType, parameter.referenceParaName, parameter.referenceParaIndex);
                    txValue = parameter.op ? utils.aOpB(txValue, parameter.op, parameter.externalValue) : txValue;
                    inputValues.push(txValue);
                }
            }
        });
        return inputValues;
    }
    /*
    {
        'dependencies': [
          {
            'index': 0,
            'subIndex': 0,
            'dependentCondition': {  // event / rFunc
              'paraName': 'para1',  // 只能是返回值
              'paraIndex': 0,        // 当返回值没有名称的时候，用序号
              'compareType': 'eq/lt/gt/lte/gte/between/include/includedBy',
              'compareValue': 100000
            }
          },
          {
            'index': 2,
            'subIndex': 0,
            'dependentCondition': {  // wFunc
              'status': 'receiptSuccess'
            }
          }
        ],
        'type': 'rFunc',
        'from': '0x...',
        'chainId': 1,
        'contractAddr': '0x...',
        'name': 'interfaceName',
        'abi': [],
        'parameters': [
          {  // 本地输入
            'paraName': 'para1',
            'inputType': 'local',
            'value': 1
          },
          {  // 从事件中提取参数值
            'paraName': 'para2',
            'index': 1,
            'subIndex': 0,
            'inputType': 'event',
            'interfaceName': 'xxxx',
            'referenceParaName': 'para1'
          },
          {  // 从只读接口中获取返回值作为参数值
            'paraName': 'para3',
            'inputType': 'rFunc',
            'interfaceName': 'xxxx',
            'referenceParaName': 'para1',  // 只能是返回值
            'referenceParaIndex': 0        // 当返回值没有名称的时候，用序号
          }
        ],
        'result': [
          {
            'blockNumber': 1,  // 记录当前区块信息
            'blockHash': '0x...',
            'paraInfo': [
              {
                'paraName': 'para1',
                'paraValue': 1
              }
            ]
          }
        ]
      }
      */
    readData(subStep) {
        if (this.checkDependences(subStep)) {
            const web3 = this.networkCenter.getWeb3(subStep.chainId);
            const contractAbi = this.contractAbi[subStep.chainId][subStep.to];
            var contract = new web3.eth.Contract(contractAbi, subStep.to);
            const contractFunc = contract.methods[subStep.signature];
            const inputValues = this.prepareFuncInputValues(subStep);
            var fromAddr = '';
            if (subStep.from.valueType == 'constant') {
                fromAddr = subStep.from.address;
            } else {
                fromAddr = this.getValueFromStep(subStep.from.step, subStep.from.address, 0, subStep.from.referenceType);
            }
            contractFunc(...inputValues).call({from: fromAddr}).then(result => {
                subStep.result.push({
                    'blockNumber': currentBlockNumber,
                    'blockHash': currentBlockHash,
                    'returnValues': result
                })
            });
        }
    }
    
    /*
        'gasPriceType': 'fivePercent/tenPercent/twentyPercent/constant',   // frontInGlobal: 本区块内靠前，frontInFunc: 本接口内靠前
        'maxFeePerGas': '100', // GWei
        'value': 1,  // eth
        'result': {
            'blockNumber': 1,  // 记录当前区块信息
            'blockHash': '0x...',
            'txHash': '0x...',
            'status': 'TxSent/TxSentErr/ReceiptSuccess/ReceiptFailed'
        }
    */    
    writeData(subStep) {
        if (this.checkDependences(subStep)) {
            const web3 = this.networkCenter.getWeb3(subStep.chainId);
            const evmChain = this.networkCenter.getEVMChain(subStep.chainId);
            const contractAbi = this.contractAbi[subStep.chainId][subStep.to];
            var contract = new web3.eth.Contract(contractAbi, subStep.to);
            const contractFunc = contract.methods[subStep.signature];
            const inputValues = this.prepareFuncInputValues(subStep);
            const data = contractFunc(...inputValues).encodeABI();
            var maxPriorityFeePerGas;
            var maxFeePerGas;
            const sendContractTx = (tx) => {
                contractFunc(...inputValues).estimateGas({from: subStep.from}).then(gasLimit => {
                    tx.gasLimit = gasLimit;
                    const privateKey = this.wallet.getPrivateKey(subStep.from);
                    if (privateKey != null) {
                        web3.eth.accounts.signTransaction(tx, privateKey).then(signedTx => {
                            subStep.txHash = signedTx.transactionHash;
                            web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction)
                            .on('transactionHash', txHash => {
                                subStep.result.status = 'TxSent';
                            })
                            .on('receipt', receipt => {
                                subStep.result.status = receipt.status ? 'ReceiptSuccess' : 'ReceiptFailed';
                                subStep.result.blockNumber = receipt.blockNumber;
                                subStep.result.blockHash = receipt.blockHash;
                            })
                            .on('error', error => {
                                subStep.result.status = 'TxSentErr';
                            });
                        });
                    } else {
                        web3.eth.sendTransaction(tx)
                        .on('transactionHash', txHash => {
                            subStep.result.status = 'TxSent';
                        })
                        .on('receipt', receipt => {
                            subStep.result.status = receipt.status ? 'ReceiptSuccess' : 'ReceiptFailed';
                            subStep.result.blockNumber = receipt.blockNumber;
                            subStep.result.blockHash = receipt.blockHash;
                        })
                        .on('error', error => {
                            subStep.result.status = 'TxSentErr';
                        });
                    }
                });
            }
            const sendTransaction = () => {
                var interfaceGasPrices = evmChain.getGasPriceStatOnInterface(subStep.to, subStep.signature);
                const baseFeePerGas = interfaceGasPrices.baseFeePerGas;
                
                if (subStep.gasPriceType == 'fivePercent') {
                    maxPriorityFeePerGas = interfaceGasPrices.fivePercentPriorityFeePerGas;
                } else if (subStep.gasPriceType == 'tenPercent') {
                    maxPriorityFeePerGas = interfaceGasPrices.tenPercentPriorityFeePerGas;
                } else if (subStep.gasPriceType == 'twentyPercent') {
                    maxPriorityFeePerGas = interfaceGasPrices.twentyPercentPriorityFeePerGas;
                }
                maxFeePerGas = '0x' + new BigNumber(baseFeePerGas).plus(new BigNumber(maxPriorityFeePerGas)).toString(16);
                const tx = {
                    from: subStep.from,
                    to: subStep.to,
                    data,
                    value: '0x' + new BigNumber(subStep.value).shiftedBy(18).toString(16),
                    maxFeePerGas, 
                    maxPriorityFeePerGas,
                    nonce: this.getNonce(subStep.from)
                }
                sendContractTx(tx);
            }
            if (subStep.gasPriceType == 'constant') {
                maxFeePerGas = '0x' + new BigNumber(subStep.maxFeePerGas).shiftedBy(9).toString(16);
                const tx = {
                    from: subStep.from,
                    to: subStep.to,
                    data,
                    value: '0x' + new BigNumber(subStep.value).shiftedBy(18).toString(16),
                    maxFeePerGas,
                    nonce: this.getNonce(subStep.from)
                }
                sendContractTx(tx);
            } else {
                const lastBlockTimestamp = evmChain.getLastBlockTimestamp();
                const now = Math.round(new Date() / 1000);
                
                if (now - lastBlockTimestamp >= timeInterval[subStep.chainId]) {   // different blockchain need have different time interval
                    sendTransaction();
                } else {
                    const waitTime = timeInterval[subStep.chainId] - (now - lastBlockTimestamp);
                    setInterval(() => { 
                        sendTransaction();
                      }, waitTime * 1000);
                }
            }
        }
    }
    
    /*
    {
        'dependencies': [],
        'type': 'clearResult',
        'indexList': [
            {
                index: 1,
                subIndex: 1
            }
        ]
    }
    */
    clearResult(subStep) {
        if (this.checkDependences(subStep)) {
            subStep.indexList.map(indexInfo => {
                const subStep = this.scriptConfig[indexInfo.index][indexInfo.subIndex];
                subStep.result = [];
            });
        }
    }
    /*
    {
        'dependencies': [],
        'type': 'pendingTx',
        'chainId': 1,
        'contractAddr': '0x...',
        'name': 'interfaceName',
        'inputs': [],
        'filter': {
          'para1': [1,2]
        },
        'result': [
          {
            'blockNumber': 1,
            'blockHash': '0x...',
            'txHash': '0x...',
            'gasPrice': 100,
            'from': '0x...',
            'paraInfo': [
              {
                'paraName': 'para1',
                'paraValue': 1
              }
            ]
          }
        ]
      }
    */
    
    getEventValue(subStep, paraName) {
        var paraValue = null;   
        const currentBlockNumber = this.networkCenter.getEVMChain(subStep.chainId).getLastBlockNumber(); 
        subStep.result.forEach(result => {
            if (paraValue != null) return;
            if (currentBlockNumber - result.blockNumber <= subStep.maxBlockInterval) {
                if (result.returnValues[paraName] == null) throw 'in event, no value of ' + paraName;
                paraValue = result.returnValues[paraName];
            }
        })
        return paraValue;
    }
    
    // 获得rFunc结果值
    getRFuncValue(subStep, paraName, paraIndex) {
        var paraValue = null;
        subStep.result.forEach(result => {
            if (paraValue != null) return;
            if (result.returnValues[paraName] == null && result.returnValues[paraIndex] == null) throw 'no value of ' + paraName;
            paraValue = result.returnValues[paraName] != null ? result.returnValues[paraName] : result.returnValues[paraIndex];
        })
        return paraValue;
    }

    getTxValue(subStep, valueType, paraName, paraIndex) {
        if (subStep.result.length > 0) {
          throw 'the result of ' + subStep.type + ' is null';
        }
        const transaction = subStep.result[0];
        if (valueType == ValueType.from) {
            return transaction.from;
        } else if (valueType == ValueType.to) {
            return transaction.to;
        } else if (valueType == ValueType.value) {
            return new BigNumber(transaction.value);
        } else if (valueType == ValueType.gasPrice) {
            return new BigNumber(transaction.gasPrice);
        } else if (valueType == ValueType.parameter) {
            var paraValue = null;
            if (transaction.decodedParameter[paraName] == null && transaction.decodedParameter[paraIndex] == null) throw 'no value of ' + paraName + ' in ' + transaction.hash;
            paraValue = transaction.decodedParameter[paraName] != null ? transaction.decodedParameter[paraName] : transaction.decodedParameter[paraIndex];
            return paraValue;
        }
    }

    getValueFromStep(subStep, paraName, paraIndex, referenceType) {
        var resultValue;
        if (subStep.type == 'event') {
            resultValue = this.getEventValue(subStep, paraName);      
        } else if (subStep.type == 'rFunc') {
            resultValue = this.getRFuncValue(subStep, paraName, paraIndex);  
        } else if (subStep.type == 'pendingTx' || subStep.type == 'executedTx') {
            resultValue = this.getTxValue(subStep, referenceType, paraName, paraIndex);
        }
        return resultValue;
    }
}