const evmChainIds = {
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

const browserScan = {
    1: {'webUrl': 'https://api.etherscan.io', 'apiKey': 'RQ1U2VU9D1HJ2XWPV8IRS373MKNRAXYIW4'},
    56: {'webUrl': 'https://api.bscscan.com', 'apiKey': 'H2IWZB1394DTNP1RF2C18M7XYPU8WC55FC'},
    137: {'webUrl': 'https://api.polygonscan.com', 'apiKey': 'TP3C9EXNAKNIM82G612I4WIFRG8M6V6I8Y'}
}
const getABIUrl = '{scanUrl}/api?module=contract&action=getabi&apikey={apiKey}&address={contractAddr}';

export {evmChainIds, browserScan, getABIUrl}