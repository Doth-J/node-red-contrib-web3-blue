"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const web3_1 = __importDefault(require("web3"));
const child_process_1 = require("child_process");
module.exports = function (RED) {
    function RPCNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', (msg, send, done) => __awaiter(this, void 0, void 0, function* () {
            const options = {
                ip: msg.ip || config.ip,
                port: msg.port || config.port,
                rpc: msg.rpc || config.rpc,
                account: msg.account || config.account,
                block: msg.block || config.block
            };
            try {
                const w3 = new web3_1.default(options.rpc);
                switch (config.function) {
                    case "Ganache Server": {
                        msg.payload = {};
                        if (msg.start) {
                            msg.payload.start = (0, child_process_1.execSync)(`npx ganache --port=${options.port} --detach ${options.ip != '127.0.0.1' ? `--host ${options.ip}` : ``}`).toString();
                        }
                        if (msg.stop) {
                            msg.payload.stop = (0, child_process_1.execSync)(`npx ganache instances stop ${msg.instance}`).toString();
                        }
                        if (msg.list) {
                            msg.payload.list = (0, child_process_1.execSync)(`npx ganache instances list`).toString();
                        }
                        break;
                    }
                    case "Get Accounts": {
                        msg.payload = yield w3.eth.getAccounts();
                        break;
                    }
                    case "Balance of": {
                        msg.payload = yield w3.eth.getBalance(options.account);
                        break;
                    }
                    case "Get Block": {
                        msg.payload = yield w3.eth.getBlock(options.block);
                        break;
                    }
                    case "Get Transactions": {
                        msg.payload = (yield w3.eth.getBlock(options.block)).transactions;
                        break;
                    }
                    case "Send Transaction": {
                        msg.payload = yield w3.eth.sendTransaction(msg.payload);
                        break;
                    }
                }
            }
            catch (error) {
                msg.payload = error;
            }
            send(msg);
            if (done)
                done();
        }));
    }
    RED.nodes.registerType('rpc', RPCNode);
    function AccountNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', (msg, send, done) => __awaiter(this, void 0, void 0, function* () {
            const options = {
                rpc: msg.rpc || config.rpc,
                account: msg.account || config.account,
                privateKey: msg.privateKey || config.privateKey,
                password: msg.password || config.password,
                duration: msg.duration || config.duration
            };
            try {
                const w3 = new web3_1.default(options.rpc);
                switch (config.function) {
                    case "Create Account": {
                        msg.payload = yield w3.eth.accounts.create();
                        break;
                    }
                    case "Recover Account": {
                        msg.payload = yield w3.eth.accounts.privateKeyToAccount(options.privateKey);
                        break;
                    }
                    case "Import Account": {
                        const accounts = yield w3.eth.getAccounts();
                        const account = yield w3.eth.accounts.privateKeyToAccount(options.privateKey);
                        if (!accounts.includes(account.address))
                            yield w3.eth.personal.importRawKey(options.privateKey, options.password);
                        msg.payload = yield w3.eth.accounts.encrypt(options.privateKey, options.password);
                        break;
                    }
                    case "Decrypt Account": {
                        try {
                            msg.payload = yield w3.eth.accounts.decrypt(msg.payload, options.password);
                        }
                        catch (e) {
                            msg.reason = e;
                            msg.payload = false;
                        }
                        break;
                    }
                    case "Unlock Account": {
                        try {
                            msg.payload = yield w3.eth.personal.unlockAccount(options.account, options.password, parseInt(options.duration));
                        }
                        catch (e) {
                            msg.reason = e;
                            msg.payload = false;
                        }
                        break;
                    }
                    case "Lock Account": {
                        msg.payload = yield w3.eth.personal.lockAccount(options.account);
                        break;
                    }
                    case "Sign Data": {
                        msg.payload = yield w3.eth.accounts.sign(msg.payload, options.privateKey);
                        break;
                    }
                    case "Sign Transaction": {
                        msg.payload = yield w3.eth.accounts.signTransaction(msg.payload, options.privateKey);
                        break;
                    }
                    case "Recover Transaction": {
                        msg.payload = yield w3.eth.accounts.recoverTransaction(msg.payload);
                        break;
                    }
                    case "Recover Signer": {
                        const signed = msg.payload;
                        if (signed.message && signed.v && signed.r && signed.s) {
                            msg.payload = yield w3.eth.accounts.recover(signed.message, signed.v, signed.r, signed.s);
                        }
                        else if (signed.message && signed.signature) {
                            msg.payload = yield w3.eth.accounts.recover(signed.message, signed.signature);
                        }
                        else {
                            msg.payload = yield w3.eth.accounts.recover(msg.payload);
                        }
                        break;
                    }
                }
            }
            catch (error) {
                msg.payload = error;
            }
            send(msg);
            if (done)
                done();
        }));
    }
    RED.nodes.registerType('accounts', AccountNode);
    function ContractNode(config) {
        RED.nodes.createNode(this, config);
        this.on('input', (msg, send, done) => __awaiter(this, void 0, void 0, function* () {
            const options = {
                rpc: msg.rpc || config.rpc,
                abi: msg.abi || config.abi,
                bytecode: msg.bytecode || config.bytecode,
                arguments: msg.args || config.arguments,
                account: msg.account || config.account,
                contractAddress: msg.contractAddress || config.contractAddress,
                contractFunction: msg.contractFunction || config.contractFunction,
                contractArgs: msg.contractArgs || config.contractArgs,
                gasLimit: msg.gasLimit || config.gasLimit,
                value: msg.value || config.value
            };
            try {
                const w3 = new web3_1.default(options.rpc);
                switch (config.function) {
                    case "Deploy Contract": {
                        const contract = new w3.eth.Contract(options.abi);
                        const gasEstimation = yield w3.eth.estimateGas({ data: contract.deploy({ data: options.bytecode, arguments: options.arguments }).encodeABI() });
                        yield contract.deploy({ data: options.bytecode, arguments: options.arguments }).send({
                            from: options.account,
                            gas: Math.floor(gasEstimation * 1.5),
                            gasPrice: yield w3.eth.getGasPrice()
                        }).then((instance) => msg.payload = instance.options)
                            .catch((e) => msg.payload = e.message);
                        break;
                    }
                    case "Call to Contract": {
                        const contract = new w3.eth.Contract(options.abi, options.contractAddress);
                        console.log(contract);
                        msg.payload = yield contract.methods[options.contractFunction](...options.contractArgs)
                            .call({ from: options.account })
                            .catch((e) => e.message);
                        break;
                    }
                    case "Send to Contract": {
                        const contract = new w3.eth.Contract(options.abi, options.contractAddress);
                        msg.payload = yield contract.methods[options.contractFunction](...options.contractArgs)
                            .send({ from: options.account, gasLimit: options.gasLimit })
                            .catch((e) => e.message);
                        break;
                    }
                    case "Transaction with Contract": {
                        const contract = new w3.eth.Contract(options.abi, options.contractAddress);
                        msg.payload = yield contract.methods[options.contractFunction](...options.contractArgs)
                            .send({ from: options.account, gasLimit: options.gasLimit, value: options.value })
                            .catch((e) => e.message);
                        break;
                    }
                }
            }
            catch (error) {
                msg.payload = error;
            }
            send(msg);
            if (done)
                done();
        }));
    }
    RED.nodes.registerType('contracts', ContractNode);
};
