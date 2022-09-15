
import Web3 from 'web3';
import * as utils from '../../utils/utils';

export default class Converter {
    constructor(script) {
        this.script = script;
        this.web3 = new Web3();
    }
    convertTxBaseInfo(txBaseInfo) {
        const newTxBaseInfoConfig = {
            title: txBaseInfo.title,
            chainId: txBaseInfo.chain,
            to: txBaseInfo.contractAddr
        }
        var from = null;
        if (txBaseInfo['from'] != null) {
            if (txBaseInfo['from'].valueType == 'constant') 
                from = txBaseInfo['from'].address;
            else {
                from = {};
                from.step = txBaseInfo['from'].step; 
                if (this.script['subScripts'][from.step].type == 'pendingTx' || this.script['subScripts'][from.step].type == 'executedTx') {
                    try {
                        const obj = JSON.prarse(from.address);
                        from.referenceType = obj.referenceType == 'from' ? 1 : 2;   // 1: ValueType.from  2: ValueType.to
                    } catch (error) {
                        from.referenceType = 5;  // ValueType.parameter
                    }
                }
                from.address = txBaseInfo['from'].address;
            }
            newTxBaseInfoConfig.from = from;
        }
        return newTxBaseInfoConfig;
    }

    convertEventInfo(eventInfo) {
        const eventElement = JSON.parse(eventInfo.event);
        const eventSig = this.web3.eth.abi.encodeEventSignature(eventElement);
        //const eventInfo = values.event.split(',');
        //const key = currentChain + '_' + contractAddr + '_' + eventInfo[1] + '_' + new Date().getTime();
        const event = {
            name: eventElement.name, 
            signature: eventSig,
            element: eventElement,
            filter: eventInfo.filter,
            result: []
        }
        return event;
    }

    convertTxMonitorInfo(functionInfo) {
        const functionElement = JSON.parse(functionInfo.function);
        const functionSig = this.web3.eth.abi.encodeFunctionSignature(functionElement);
        const pendingTxFuncionInfo = {
            name: functionElement.name,
            signature: functionSig,
            element: functionElement,
            parameterCondition: {}
        }
        if (functionInfo.msgValue != null && functionInfo.msgValue.op != null && functionInfo.msgValue.value != null) {
            pendingTxFuncionInfo.valueCondition = functionInfo.msgValue;
        }
        functionElement.inputs.map(input => {
            if (functionInfo[input.name].op != null && functionInfo[input.name].value != null) {
                pendingTxFuncionInfo.parameterCondition[input.name] = functionInfo[input.name];
            }
        })
        return pendingTxFuncionInfo;
    }

    convertFunctionInfo(functionInfo) {
        const functionElement = JSON.parse(functionInfo.function);
        const functionSig = this.web3.eth.abi.encodeFunctionSignature(functionElement);
        const functionSelected = {
            name: functionElement.name,
            signature: functionSig,
            element: functionElement,
            parameters: []
        }
        functionElement.inputs.map((input, index) => {
            const inputName = utils.isEmptyObj(input.name) ? '#' + index : input.name;
            if (functionInfo[inputName].valueType == 'constant') {
                functionSelected.parameters.push({paraName: inputName, value: functionInfo[inputName].value});
            } else {
                var referenceParaName = functionInfo[inputName].referenceParaName;
                var referenceParaIndex = -1; 
                if (referenceParaName.indexOf('#') == 0) {
                    referenceParaIndex = referenceParaName.substr(1); 
                }
                functionSelected.parameters.push({  paraName: inputName,
                                                    step: functionInfo[inputName].step,
                                                    referenceParaName, 
                                                    referenceParaIndex,
                                                    op: functionInfo[inputName].op,
                                                    externalValue: functionInfo[inputName].externalValue});
            }
        });
        return functionSelected;
    }

    convertDependency(dependencyInfo) {
        const dependencies = {
            logic: dependencyInfo.logic,
            delayedTime: dependencyInfo.delayedTime,
            conditions: []
        }
        dependencyInfo.dependency.map(dependency => {
            var paraName = dependency.parameter;
            var paraIndex = -1; 
            if (paraName.indexOf('#') == 0) {
                paraIndex = paraName.substr(1); 
            }
            const condition = {
                step: dependency.step,
                paraName,
                paraIndex,
                compareType: dependency.compareType,
                compareValue: dependency.compareValue
            }
            if (dependency.step == 'timer') {
                condition.compareValue = condition.compareValue.unix();  // s
            }
            dependencies.conditions.push(condition);
        });
        return dependencies;
    }

    convertLeftConfig(leftConfigInfo) {
        const leftConfig = {
            value: leftConfigInfo.value,
            gasPriceType: leftConfigInfo.gasPrice.valueType,
            maxFeePerGas: leftConfigInfo.gasPrice.maxFeePerGas,
            repeaTimes: leftConfigInfo.repeaTimes,
            repeatCondition: leftConfigInfo.repeatCondition
        }
        return leftConfig;
    }

    convertEvent(subScript) {
        const txBaseInfo = this.convertTxBaseInfo(subScript.chainContractConfig);
        const eventInfo = this.convertEventInfo(subScript.eventConfig);
        return {...txBaseInfo, ...eventInfo}
    }

    convertTxMonitor(subScript) {
        const txBaseInfo = this.convertTxBaseInfo(subScript.chainContractConfig);
        const txMonitorInfo = this.convertTxMonitorInfo(subScript.txMonitorConfig);
        return {...txBaseInfo, ...txMonitorInfo}
    }

    convertRFunc(subScript) {
        const txBaseInfo = this.convertTxBaseInfo(subScript.chainContractConfig);
        const functionSelectedInfo = this.convertFunctionInfo(subScript.functionSelectedConfig);
        const dependencyInfo = this.convertDependency(subScript.dependencyConfig);
        return {...txBaseInfo, ...functionSelectedInfo, ...dependencyInfo}
    }

    convertWFunc(subScript) {
        const txBaseInfo = this.convertTxBaseInfo(subScript.chainContractConfig);
        const functionSelectedInfo = this.convertFunctionInfo(subScript.functionSelectedConfig);
        const dependencyInfo = this.convertDependency(subScript.dependencyConfig);
        const leftConfigInfo = this.convertLeftConfig(subScript.leftConfig);
        return {...txBaseInfo, ...functionSelectedInfo, ...dependencyInfo, ...leftConfigInfo}
    }

    convertSubScript(subScript) {
        var result;
        const currentScriptType = subScript.type;
        if (currentScriptType == 'event') {
            result = this.convertEvent(subScript);
        } else if (currentScriptType == 'pendingTx' || currentScriptType == 'executedTx') {
            result = this.convertTxMonitor(subScript);
        } else if (currentScriptType == 'rFunc') {
            result = this.convertRFunc(subScript);
        } else if (currentScriptType == 'wFunc') {
            result = this.convertWFunc(subScript);
        }
        result.type = subScript.type;
        return result;
    }
}
