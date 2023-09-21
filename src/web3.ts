import web3 from "web3";
import { AbiItem } from 'web3-utils'
import * as NodeRED from "node-red";
import { execSync } from "child_process";

interface RPCNodeConfig extends NodeRED.NodeDef{
  function: string,
  ip:string,
  port:string,
  rpc: string,
  account: string,
  block: string,
}
interface AccountNodeConfig extends NodeRED.NodeDef{
  function: string,
  rpc: string,
  account: string,
  privateKey: string,
  password: string,
  duration:string
}
interface ContractNodeConfig extends NodeRED.NodeDef{
  function: string,
  rpc: string,
  abi: AbiItem | AbiItem[],
  bytecode: string,
  arguments: Array<string>,
  account: string,
  contractAddress: string,
  contractFunction: string,
  contractArgs: Array<string>,
  gasLimit: string,
  value: string
}

export = function(RED:NodeRED.NodeAPI){

    function RPCNode(this:NodeRED.Node, config:RPCNodeConfig){
      RED.nodes.createNode(this,config);
      this.on('input',async (msg:any,send,done)=>{
        const options = {
          ip: msg.ip as string || config.ip,
          port: msg.port as string || config.port,
          rpc: msg.rpc as string || config.rpc,
          account: msg.account as string || config.account,
          block: msg.block as string || config.block
        }
        try{
          const w3 = new web3(options.rpc);
          switch(config.function){
            case "Ganache Server":{
              msg.payload = {};
              if(msg.start){
                msg.payload.start = execSync(`npx ganache --port=${options.port} --detach ${options.ip != '127.0.0.1'?`--host ${options.ip}`:``}`).toString();
              }
              if(msg.stop){
                msg.payload.stop = execSync(`npx ganache instances stop ${msg.instance}`).toString();
              }
              if(msg.list){
                msg.payload.list = execSync(`npx ganache instances list`).toString();
              }
              break;
            }
            case "Get Accounts":{
              msg.payload = await w3.eth.getAccounts();
              break;
            } 
            case "Balance of":{
              msg.payload = await w3.eth.getBalance(options.account)
              break;
            }
            case "Get Block":{
              msg.payload = await w3.eth.getBlock(options.block)
              break;
            }
            case "Get Transactions":{
              msg.payload = (await w3.eth.getBlock(options.block)).transactions
              break;
            }
            case "Send Transaction":{
              msg.payload = await w3.eth.sendTransaction(msg.payload);
              break;
            }
          }
        }catch(error:any){
            msg.payload = error;
        }
        send(msg);
        if(done) done();
      });
    }
    RED.nodes.registerType('rpc',RPCNode);
    
    function AccountNode(this:NodeRED.Node, config:AccountNodeConfig){
      RED.nodes.createNode(this,config);
      this.on('input',async (msg:any,send,done)=>{
        const options = {
          rpc: msg.rpc as string || config.rpc,
          account: msg.account as string || config.account,
          privateKey: msg.privateKey as string || config.privateKey,
          password: msg.password as string || config.password,
          duration: msg.duration as string || config.duration
        }
        try{
          const w3 = new web3(options.rpc);
          switch(config.function){
            case "Create Account":{
              msg.payload = await w3.eth.accounts.create();
              break;
            }
            case "Recover Account":{
              msg.payload = await w3.eth.accounts.privateKeyToAccount(options.privateKey);
              break;
            }
            case "Import Account":{
              const accounts = await w3.eth.getAccounts();
              const account = await w3.eth.accounts.privateKeyToAccount(options.privateKey);
              if(!accounts.includes(account.address)) await w3.eth.personal.importRawKey(options.privateKey,options.password)
              msg.payload = await w3.eth.accounts.encrypt(options.privateKey,options.password);
              break;
            }
            case "Decrypt Account":{
              try{
                msg.payload = await w3.eth.accounts.decrypt(msg.payload,options.password);
              }catch(e){
                msg.reason = e
                msg.payload = false
              }
              break;
            }
            case "Unlock Account":{
              try{
                msg.payload = await w3.eth.personal.unlockAccount(options.account,options.password,parseInt(options.duration))
              }catch(e){
                msg.reason = e
                msg.payload = false
              }
              break;
            }
            case "Lock Account":{
              msg.payload = await w3.eth.personal.lockAccount(options.account)
              break;
            }
            case "Sign Data":{
              msg.payload = await w3.eth.accounts.sign(msg.payload,options.privateKey);
              break;
            }
            case "Sign Transaction":{
              msg.payload = await w3.eth.accounts.signTransaction(msg.payload,options.privateKey);
              break;
            }
            case "Recover Transaction":{
              msg.payload = await w3.eth.accounts.recoverTransaction(msg.payload);
              break;
            }
            case "Recover Signer":{
              const signed = msg.payload;
              if (signed.message && signed.v && signed.r && signed.s){
                msg.payload = await w3.eth.accounts.recover(signed.message,signed.v,signed.r,signed.s);
              }else if(signed.message && signed.signature){
                msg.payload = await w3.eth.accounts.recover(signed.message,signed.signature);
              }else{
                msg.payload = await w3.eth.accounts.recover(msg.payload);
              }
              break;
            }
          }
        }catch(error:any){
          msg.payload = error;
        }
        send(msg);
        if(done) done();
      });
    }
    RED.nodes.registerType('accounts',AccountNode);

    function ContractNode(this:NodeRED.Node, config:ContractNodeConfig){
      RED.nodes.createNode(this,config);
      this.on('input',async (msg:any,send,done)=>{
        const options = {
          rpc: msg.rpc as string || config.rpc,
          abi: msg.abi as AbiItem | AbiItem[] || config.abi,
          bytecode: msg.bytecode as string || config.bytecode,
          arguments: msg.args as string[] || config.arguments,
          account: msg.account as string || config.account,
          contractAddress: msg.contractAddress as string || config.contractAddress,
          contractFunction: msg.contractFunction as string || config.contractFunction,
          contractArgs: msg.contractArgs as Array<string> || config.contractArgs,
          gasLimit: msg.gasLimit as string || config.gasLimit,
          value: msg.value as string || config.value
        }
        try{
          const w3 = new web3(options.rpc);
          switch(config.function){
            case "Deploy Contract":{
              const contract = new w3.eth.Contract(options.abi);
              const gasEstimation = await w3.eth.estimateGas({data:contract.deploy({data: options.bytecode,arguments: options.arguments}).encodeABI()});
              await contract.deploy({data: options.bytecode,arguments: options.arguments}).send({
                from: options.account,
                gas: Math.floor(gasEstimation*1.5),
                gasPrice: await w3.eth.getGasPrice()
              }).then((instance)=>msg.payload = instance.options)
              .catch((e:Error)=>msg.payload = e.message);
              break;
            }
            case "Call to Contract":{
              const contract = new w3.eth.Contract(options.abi,options.contractAddress);
              console.log(contract)
              msg.payload = await contract.methods[options.contractFunction](...options.contractArgs)
              .call({from:options.account})
              .catch((e:Error)=>e.message);
              break;
            }
            case "Send to Contract":{
              const contract = new w3.eth.Contract(options.abi,options.contractAddress);
              msg.payload = await contract.methods[options.contractFunction](...options.contractArgs)
              .send({from:options.account, gasLimit:options.gasLimit})
              .catch((e:Error)=>e.message);
              break;
            }
            case "Transaction with Contract":{
              const contract = new w3.eth.Contract(options.abi,options.contractAddress);
              msg.payload = await contract.methods[options.contractFunction](...options.contractArgs)
              .send({from:options.account, gasLimit:options.gasLimit, value: options.value})
              .catch((e:Error)=>e.message);
              break;
            }
          }
        }catch(error:any){
          msg.payload = error;
        }
        send(msg);
        if(done) done();
      });
    }
    RED.nodes.registerType('contracts',ContractNode);
      
}