module.exports = enableRelay

/**
 * enable relay on a contract class, or on entire "truffle artifacts" object
 * usage:
 * enableRelay(web3)
 * enableRelay(artifacts) - in truffle test
 *
 * or: enableRelay( artifacts.require( "MyContract")) - enable for specific contract
 * 
 * the object is modified in-place, and also returned by the function.
 * there's no problem of attempting to re-enable
 *
 * TODO: allow enableRelay(Web3), to enable on all future contract object creation.
 */
function enableRelay(contractOrWeb3orArtifacts, relayOptions) {

	relayOptions = relayOptions || {}

	try {
		if ( contractOrWeb3orArtifacts.currentProvider &&
			contractOrWeb3orArtifacts.currentProvider.send
		 )
			return enableWeb3relay(contractOrWeb3orArtifacts, relayOptions)

			//its truffle "artifacts.require"
		if ( typeof contractOrWeb3orArtifacts["require"] == 'function')
				return enableTruffleRelay(contractOrWeb3orArtifacts, relayOptions)
		return enableContractRelay(contractOrWeb3orArtifacts, relayOptions)
	} catch(e) {
		// throw e
		throw  Error( "not a valid web3.contract or truffle artifacts " + e)
	}
}

function enableWeb3relay(web3, relayOptions) {
	
	enableProviderRelay(web3.currentProvider, "provider", relayOptions)
	return web3
}

//modify (and return) the truffle artifacts object, to automatically enable relay on every contract it returns.
function enableTruffleRelay(artifacts, relayOptions) {

	if ( artifacts.relayEnabled )
		return artifacts
	artifacts_require = artifacts.require.bind(artifacts)
	artifacts.relayEnabled = true
	artifacts.require = function(arg) {
 		return enableRelay(artifacts_require(arg), relayOptions)
	}.bind(artifacts)

	return artifacts
}

function enableContractRelay(contract, relayOptions) {

	// if ( !contract.web3 )
	// 	provider = contract.contract._eth._requestManager.provider
	//else
	enableProviderRelay(contract.web3.currentProvider, contract.contractName, relayOptions)
	return contract
}

function enableProviderRelay(provider, contractName, relayOptions) {
	
	if ( provider.relayOptions ) {
		if ( relayOptions.verbose || provider.relayOptions.verbose )
			console.log( "enableContractRelay:",contractName," - already hooked") 
	}
	if ( relayOptions.verbose )
		console.log( "enableContractRelay: hooking ",contractName)

	provider.send = relay_send(provider.send.bind(provider), relayOptions)
	provider.sendAsync = relay_sendAsync(provider.sendAsync.bind(provider), relayOptions)
	provider.relayOptions=relayOptions
}

function strlen(s) {
	return s ? s.length : undefined
}

function relay_send(originalSend, relayOptions) {
    return function(payload) {

		// {
		//   "params": [
		//     {
		//       "gas": "0x6691b7",
		//       "from": "0x8b898df9e57b7a3e3dc4359692d9d77e64960185",
		//       "data": "0xd1f9cf0e000000.....000",
		//       "gasPrice": "0x174876e800",
		//       "to": "0xd02c136d180b87893f267f462b2448e1e0fe4d10"
		//     }
		//   ],
		//   "jsonrpc": "2.0",
		//   "id": 47,
		//   "method": "eth_sendTransaction"
		// }
		//
		if ( payload.method != 'eth_sendTransaction' )
			return originalSend(payload)

		if ( relayOptions.verbose ) {
			console.log("calling send" + JSON.stringify(payload))
		}


		if ( relayOptions.runRelay )
			return relayOptions.runRelay(payload)

		console.log( "MISSING: options.runRelay. using originalSend" )
		return originalSend(payload)
	}
}

  // wrap a `provider.sendAsync` function with behavior hooks
  // returns a function(payload, callback) to replace `provider.sendAsync`
function relay_sendAsync(originalSendAsync, relayOptions) {
    return function(payload, callback) {

		if ( payload.method != 'eth_sendTransaction' )
			return originalSendAsync(payload, function(error, result) { callback(error, result); });

    	if ( relayOptions.verbose )
			console.log("calling sendAsync" + JSON.stringify(payload))

		if ( relayOptions.runRelay)
			return relayOptions.runRelay(payload, callback)
		
		console.log( "MISSING: options.runRelay. using originalSend" )
		return originalSendAsync(payload, function(error, result) { callback(error, result); });
	};
}

