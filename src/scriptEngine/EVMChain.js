import * as utils from '../utils/utils.js';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';

class EVMChain {
    constructor(name, chainId, rpc, wssRPC, eip1559) {
        this.rpc = rpc;
        this.name = name;
        this.chainId = chainId;
        //this.intervalTime = intervalTime;
        this.web3 = new Web3(rpc);
        this.wssWeb3 = new Web3(wssRPC);
        this.eip1559 = eip1559;
        this.lastBlockHash = '';
        this.lastBlockNumber = 0;
        this.lastBlockTimestamp = 4812306663;
        this.stateMonitorIndex = 0;  // 
        this.totalPendingTx = {
            // '0x...': {  // txHash

            // }
        };
        this.interfacePendingTx = {  // contractAddr => signature => transaction[]
            // '0x...': {  // contractAddr
            //     '0xabcdabcd': [  // signature
            //         {
            //             'txHash': '0x...',
            //             'gasPrice': 10000,
            //         }
            //     ]
            // }
        }; 
        this.gasMonitoredInterface = {
            // '0x...': {  // contract address
            //     '0x...': true  // interface code
            // }
        }
        this.gasMonitoredInterfaceTx = {
            // '0x...': {  // tx hash
            //      'contractAddr': '0x...',
            //      'signature': '0x12345678'
            // }
        }
        this.stateMonitoredPendingTx = {}
        this.stateMonitoredExcutedTx = {}
        this.duplicatedTx = {}
    }

    startMonitor() {
        //this.syncPendingTx();
        //this.syncLastestBlock();
        this.syncNewBlock();
    }

    getGasPriceStatOnPendingTx(transactions) {
        const pendingTransactions = transactions == null ? Object.values(this.totalPendingTx) : transactions;
        const length = pendingTransactions.length;
        const pendingBaseFeePerGas = new BigNumber(this.pendingBaseFeePerGas);
        if (length == 0) {
            const commonGasPrice = '0x' + new BigNumber(1).shiftedBy(18).toString(16);
            return {
                baseFeePerGas: '0x' + pendingBaseFeePerGas.toString(16),
                fivePercentPriorityFeePerGas: commonGasPrice, 
                tenPercentPriorityFeePerGas: commonGasPrice, 
                twentyPercentPriorityFeePerGas: commonGasPrice
            }
        }
        const getMinerFee = (tx) => {
            const maxFee = new BigNumber(tx.maxFeePerGas == null ? tx.gasPrice : tx.maxFeePerGas);
            if (maxFee.minus(pendingBaseFeePerGas).toNumber() < 0) {
                return 0;
            }
            if (tx.maxPriorityFeePerGas == null) {
                return maxFee.minus(pendingBaseFeePerGas).toNumber();
            }
            const minerFee = Math.min(maxFee.minus(pendingBaseFeePerGas).toNumber(), new BigNumber(tx.maxPriorityFeePerGas).toNumber());
            return minerFee;
        }
        pendingTransactions.sort((tx1, tx2) => {
            const minerFee1 = getMinerFee(tx1);
            const minerFee2 = getMinerFee(tx2);

            return minerFee2 - minerFee1;
        });
        //console.log('pending tx number', length);
        const fivePercentPriorityFeePerGas = '0x' + new BigNumber(getMinerFee(pendingTransactions[Math.floor(length / 20)])).toString(16);
        const tenPercentPriorityFeePerGas = '0x' + new BigNumber(getMinerFee(pendingTransactions[Math.floor(length / 10)])).toString(16);
        const twentyPercentPriorityFeePerGas = '0x' + new BigNumber(getMinerFee(pendingTransactions[Math.floor(length / 5)])).toString(16);
        
        return {
            baseFeePerGas: '0x' + pendingBaseFeePerGas.toString(16),
            fivePercentPriorityFeePerGas, 
            tenPercentPriorityFeePerGas, 
            twentyPercentPriorityFeePerGas
        }
    }

    getGasPriceStatOnInterface(contractAddr, signature) {
        if (this.interfacePendingTx[contractAddr] == null || this.interfacePendingTx[contractAddr][signature] == null) {
            return this.getGasPriceStatOnPendingTx();
        }
        const blockGasStat = this.getGasPriceStatOnPendingTx();
        const interfaceGasStat = this.getGasPriceStatOnPendingTx(this.interfacePendingTx[contractAddr][signature]);
        const fivePercentPriorityFeePerGas = new BigNumber(blockGasStat.fivePercentPriorityFeePerGas).gt(new BigNumber(interfaceGasStat.fivePercentPriorityFeePerGas)) 
                                     ? blockGasStat.fivePercentPriorityFeePerGas : interfaceGasStat.fivePercentPriorityFeePerGas;
        const tenPercentPriorityFeePerGas = new BigNumber(blockGasStat.tenPercentPriorityFeePerGas).gt(new BigNumber(interfaceGasStat.tenPercentPriorityFeePerGas)) 
                                    ? blockGasStat.tenPercentPriorityFeePerGas : interfaceGasStat.tenPercentPriorityFeePerGas;
        const twentyPercentPriorityFeePerGas = new BigNumber(blockGasStat.twentyPercentPriorityFeePerGas).gt(new BigNumber(interfaceGasStat.twentyPercentPriorityFeePerGas)) 
                                    ? blockGasStat.twentyPercentPriorityFeePerGas : interfaceGasStat.twentyPercentPriorityFeePerGas;
        return {
            baseFeePerGas: interfaceGasStat.baseFeePerGas,
            fivePercentPriorityFeePerGas, 
            tenPercentPriorityFeePerGas, 
            twentyPercentPriorityFeePerGas
        }
    }

    // from: 0x000,0x111...
    // to: 0x000,0x111...
    // valueCondition: {value: 1, op: '>/</=/>=/<='}
    // parameterCondition = {para1: {op: '>', value: 1}, para2: {op: '<', value: 1}, }
    addStateMonitoredPendingTx(from, to, valueCondition, signature, inputs, parameterCondition, callback) {        
        this.stateMonitoredPendingTx[this.stateMonitorIndex++] = {from, to, valueCondition, signature, inputs, parameterCondition, callback};
        return this.stateMonitorIndex;
    }

    removeStateMonitoredPendingTx(index) {
        if (this.stateMonitoredPendingTx[index] != null) {
            delete this.stateMonitoredPendingTx[index];
        }        
    }

    addStateMonitoredExcutedTx(from, to, valueCondition, signature, inputs, parameterCondition, callback) {        
        this.stateMonitoredExcutedTx[this.stateMonitorIndex++] = {from, to, valueCondition, signature, inputs, parameterCondition, callback};
        return this.stateMonitorIndex;
    }

    removeStateMonitoredExcutedTx(index) {
        if (this.stateMonitoredExcutedTx[index] != null) {
            delete this.stateMonitoredExcutedTx[index];
        }        
    }

    addGasMonitoredPendingTx(contractAddr, signature, comment) {
        this.gasMonitoredInterface[this.stateMonitorIndex++] = {contractAddr, signature, comment};
        return this.stateMonitorIndex;
    }

    removeGasMonitoredPendingTx(index) {
        if (this.gasMonitoredInterface[index] != null) {
            delete this.gasMonitoredInterface[index];
        } 
    }

    syncPendingTx() {
        const _this = this;
        let txCount = 0;
        this.wssWeb3.eth.subscribe('pendingTransactions', function (error, result) {
            if (error != null)
                console.log(error.message);
        }).on("data", function (transactionHash) {
            if (_this.totalPendingTx[transactionHash] != null || _this.duplicatedTx[transactionHash] != null) {
                delete _this.totalPendingTx[transactionHash];
                _this.duplicatedTx[transactionHash] = true;
                return;
            }
            _this.web3.eth.getTransaction(transactionHash).then(function (transaction) {
                if (transaction == null) return;
                txCount++;
                //if (txCount % 100 == 0) console.log('tx count', txCount);
                
                _this.totalPendingTx[transactionHash] = transaction;

                const contractAddr = transaction.to;
                const signature = transaction.input.substr(0, 10);
                Object.values(_this.gasMonitoredInterface).map(monitorInfo => {
                    if (monitorInfo.contractAddr.toUpperCase() == contractAddr.toUpperCase() && monitorInfo.signature == signature) {
                        if (_this.interfacePendingTx[contractAddr] == null) {
                            _this.interfacePendingTx[contractAddr] = {};
                            _this.interfacePendingTx[contractAddr][signature] = [];
                        }
                        _this.interfacePendingTx[contractAddr][signature].push(transaction);
                        _this.gasMonitoredInterfaceTx[transaction.hash] = {
                            'contractAddr': contractAddr,
                            'signature': signature
                        }
                    }
                });
                Object.values(_this.stateMonitoredPendingTx).map(monitorInfo => {
                    // {from, to, valueCondition, signature, inputs, parameterCondition, callback}
                    _this.monitorTx(monitorInfo, transaction);
                })
            });
        });
    }

    monitorTx(monitorInfo, transaction) {
        const signatureIsNull = utils.isEmptyObj(transaction.signature);
        if (!utils.isEmptyObj(monitorInfo.from) && monitorInfo.from.toUpperCase().indexOf(transaction.from.toUpperCase()) == -1) {
            return;
        }
        if (!utils.isEmptyObj(monitorInfo.to) 
        && ((!signatureIsNull && monitorInfo.to.toUpperCase() != transaction.to.toUpperCase()) 
            || (signatureIsNull && monitorInfo.to.toUpperCase().indexOf(transaction.to.toUpperCase())))) {
            return;
        }
        if (monitorInfo.valueCondition != null) {
            const value = new BigNumber(transaction.value);
            const comparedValue = new BigNumber(monitorInfo.valueCondition.value).shiftedBy(18);
            const op = monitorInfo.valueCondition.op;
            
            const expected = utils.aShouldOpB(value, op, comparedValue);
            if (!expected) return;
        }
        const signature = utils.isEmptyObj(transaction.input) ? '' : transaction.input.substr(0, 10);
        if (!utils.isEmptyObj(transaction.signature) && signature == monitorInfo.signature) {
            const data = transaction.input.substr(10);
            const parameters = this.web3.eth.abi.decodeParameters(monitorInfo.inputs, data);
            // parameterCondition = {para1: {op: '>', value: 1}, para2: {op: '<', value: 1}, }
            for (const [parameter, condition] of Object.entries(monitorInfo.parameterCondition)) {
                if (!utils.aShouldOpB(parameters[parameter], condition.op, condition.value)) {
                    return;
                }
            }
            transaction.decodedParameter = parameters;
        }
        const callbackFunc = monitorInfo.callback;                    
        callbackFunc(transaction);
    }
    
    getBlock(blockHashOrBlockNumber) {
        const _this = this;
        const txDetail = Object.keys(this.stateMonitoredExcutedTx).length > 0;
        this.web3.eth.getBlock(blockHashOrBlockNumber, txDetail, (error, block) => {
            if (error != null) {
                console.log('getBlock erro', error);
                return;
            }
            if (_this.lastBlockHash == block.hash) return;
            _this.lastBlockHash = block.hash;
            _this.lastBlockNumber = block.number;
            _this.lastBlockTimestamp = block.timestamp;

            _this.pendingBaseFeePerGas = _this.caculatePendingBaseFee(block.baseFeePerGas, block.gasLimit, block.gasUsed);
            const now = Math.round(new Date() / 1000);
            //console.log(now, block.number, block.timestamp, 'latest block transcations:', block.transactions.length, (block.number + 1) + ' base gas fee', _this.pendingBaseFeePerGas);
            block.transactions.map(txInfo => {
                const txHash = txInfo;
                if (txDetail) {
                    txHash = txInfo.hash;
                    Object.values(_this.stateMonitoredExcutedTx).map(monitorInfo => {
                        // {from, to, valueCondition, signature, inputs, parameterCondition, callback}
                        _this.monitorTx(monitorInfo, txInfo);
                    })
                }
                if (_this.totalPendingTx[txHash] == null) return;

                delete _this.totalPendingTx[txHash];

                if (_this.gasMonitoredInterfaceTx[txHash] != null) {     
                    const contractAddr = _this.gasMonitoredInterfaceTx[txHash].contractAddr;
                    const signature = _this.gasMonitoredInterfaceTx[txHash].signature;     

                    const remainTransactions = this.interfacePendingTx[contractAddr][signature].filter(transaction => transaction.hash != txHash);
                    this.interfacePendingTx[contractAddr][signature] = remainTransactions;

                    delete _this.gasMonitoredInterfaceTx[txHash];
                }

            })
        })
    }

    syncNewBlock() {
        const _this = this;
        this.wssWeb3.eth.subscribe('newBlockHeaders', function (error, result) {
            if (error != null)
                console.log(error.message);
        }).on("data", function (blockHeader) {
            _this.lastBlockTimestamp = blockHeader.timestamp;

            const now = Math.round(new Date() / 1000);
            console.log(now, blockHeader.number, blockHeader.timestamp, now - blockHeader.timestamp);
            _this.getBlock(blockHeader.number);
        });
    }

    caculatePendingBaseFee(parentBaseFeePerGas, parentGasLimit, parentGasUsed) {
        const parentGasTarget = Math.floor(parentGasLimit / 2);
        if (parentGasTarget == parentGasUsed) return parentBaseFeePerGas;

        if (parentGasTarget > parentGasUsed) {
            const gasUsedDelta = parentGasTarget - parentGasUsed;
            const gasDelta = parentBaseFeePerGas * Math.floor(Math.floor(gasUsedDelta / parentGasTarget) / 8);
            return parentBaseFeePerGas - gasDelta;
        } else if (parentGasTarget < parentGasUsed) {
            const gasUsedDelta = parentGasUsed - parentGasTarget;
            const gasDelta = Math.max(parentBaseFeePerGas * Math.floor(Math.floor(gasUsedDelta / parentGasTarget) / 8), 1);
            return parentBaseFeePerGas + gasDelta;
        }
    }

    // syncLastestBlock() {     
    //     getBlock('latest');
    //     setInterval(() => {
    //         getBlock();
    //     }, this.intervalTime);
    // }

    getLastBlockTimestamp() {
        return this.lastBlockTimestamp;
    }

    getLastBlockNumber() {
        return this.lastBlockNumber;
    }
}

const ethereum = new EVMChain('ethereum', 
                              1, 
                              'https://eth-goerli.alchemyapi.io/v2/AxnmGEYn7VDkC4KqfNSFbSW9pHFR7PDO', //'https://eth-mainnet.g.alchemy.com/v2/v0PproF8lbsKkBDLqruaGyMq2OK-3_f5',//'https://mainnet.infura.io/v3/e95c3e3d2d81441a8552117699ffa5bd', //
                              'wss://eth-goerli.ws.alchemyapi.io/v2/AxnmGEYn7VDkC4KqfNSFbSW9pHFR7PDO', //'wss://eth-mainnet.g.alchemy.com/v2/v0PproF8lbsKkBDLqruaGyMq2OK-3_f5',//'wss://mainnet.infura.io/ws/v3/e95c3e3d2d81441a8552117699ffa5bd',  //
                              true);
ethereum.startMonitor();
// ethereum.addGasMonitoredPendingTx('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', '0x38ed1739', 'UniswapV2Router02: swapExactTokensForTokens');
// ethereum.addGasMonitoredPendingTx('0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', '0x5ae401dc', 'SwapRouter02: Multicall');
// ethereum.addGasMonitoredPendingTx('0x00000000006c3852cbEf3e08E8dF289169EdE581', '0xfb0f3ee1', 'Seaport');

// //console.log(ethereum.gasMonitoredInterface);

// setInterval(() => {
//     // const blockGasPrices = ethereum.getGasPriceStatOnPendingTx();
//     // console.log('block gas:',
//     //             new BigNumber(blockGasPrices.fivePercentPriorityFeePerGas).shiftedBy(-9).toString(10) + ' GWei, ', 
//     //             new BigNumber(blockGasPrices.tenPercentPriorityFeePerGas).shiftedBy(-9).toString(10) + ' GWei, ', 
//     //             new BigNumber(blockGasPrices.twentyPercentPriorityFeePerGas).shiftedBy(-9).toString(10) + ' GWei');
//     const lastBlockTimestamp = ethereum.getLastBlockTimestamp();
//     const now = Math.round(new Date() / 1000);
//     console.log('    ', now, lastBlockTimestamp, 'time interval:', now - lastBlockTimestamp);
//     if (now - lastBlockTimestamp < 8) return;

//     var interfaceGasPrices = ethereum.getGasPriceStatOnInterface('0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', '0x5ae401dc');
//     if (interfaceGasPrices != null)
//         console.log('SwapRouter02: Multicall gas:',
//                     new BigNumber(interfaceGasPrices.baseFeePerGas).shiftedBy(-9).toString(10) + ' GWei, ', 
//                     new BigNumber(interfaceGasPrices.fivePercentPriorityFeePerGas).shiftedBy(-9).toString(10) + ' GWei, ', 
//                     new BigNumber(interfaceGasPrices.tenPercentPriorityFeePerGas).shiftedBy(-9).toString(10) + ' GWei, ', 
//                     new BigNumber(interfaceGasPrices.twentyPercentPriorityFeePerGas).shiftedBy(-9).toString(10) + ' GWei');
        
//     interfaceGasPrices = ethereum.getGasPriceStatOnInterface('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', '0x38ed1739');
//     if (interfaceGasPrices != null)
//         console.log('UniswapV2Router02: swapExactTokensForTokens gas:',
//                     new BigNumber(interfaceGasPrices.baseFeePerGas).shiftedBy(-9).toString(10) + ' GWei, ', 
//                     new BigNumber(interfaceGasPrices.fivePercentPriorityFeePerGas).shiftedBy(-9).toString(10) + ' GWei, ', 
//                     new BigNumber(interfaceGasPrices.tenPercentPriorityFeePerGas).shiftedBy(-9).toString(10) + ' GWei, ', 
//                     new BigNumber(interfaceGasPrices.twentyPercentPriorityFeePerGas).shiftedBy(-9).toString(10) + ' GWei');
        
//     interfaceGasPrices = ethereum.getGasPriceStatOnInterface('0x00000000006c3852cbEf3e08E8dF289169EdE581', '0xfb0f3ee1');
//     if (interfaceGasPrices != null)
//         console.log('Seaport gas:',
//                     new BigNumber(interfaceGasPrices.baseFeePerGas).shiftedBy(-9).toString(10) + ' GWei, ', 
//                     new BigNumber(interfaceGasPrices.fivePercentPriorityFeePerGas).shiftedBy(-9).toString(10) + ' GWei, ', 
//                     new BigNumber(interfaceGasPrices.tenPercentPriorityFeePerGas).shiftedBy(-9).toString(10) + ' GWei, ', 
//                     new BigNumber(interfaceGasPrices.twentyPercentPriorityFeePerGas).shiftedBy(-9).toString(10) + ' GWei');
// }, 20000000);