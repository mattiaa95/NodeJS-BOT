//
// begin setup CLI
//
const MACD = require('technicalindicators').MACD;
const TICKSave = 120;
var close = []
var main = require('./main.js');

var setupCLI = () => {
	cli.on('price_subscribe', (params) => {
		if(typeof(params.pairs) === 'undefined') {
			console.log('command error: "pairs" parameter is missing.');
		} else {
			subscribe(params.pairs);
		}
	});
	cli.on('price_unsubscribe', (params) => {
		if(typeof(params.pairs) === 'undefined') {
			console.log('command error: "pairs" parameter is missing.');
		} else {
			unsubscribe(params.pairs);
		}
	});
}
//
// end setup CLI
//

//
// begin main functions
//
var priceUpdate = (update) => {
	try {
		var jsonData = JSON.parse(update);
		ProcessDataOnUpdate(jsonData)
	} catch (e) {
		console.log('price update JSON parse error: ', e);
		return;
	}
}

var subscribe = (pairs) => {
	var callback = (statusCode, requestID, data) => {
		if (statusCode === 200) {
			try {
				var jsonData = JSON.parse(data);
			} catch (e) {
				console.log('subscribe request #', requestID, ' JSON parse error: ', e);
				return;
			}
			if(jsonData.response.executed) {
				try {
					for(var i in jsonData.pairs) {
						socket.on(jsonData.pairs[i].Symbol, priceUpdate);
					}
				} catch (e) {
					console.log('subscribe request #', requestID, ' "pairs" JSON parse error: ', e);
					return;
				}
			} else {
				console.log('subscribe request #', requestID, ' not executed: ', jsonData);
			}
		} else {
			console.log('subscribe request #', requestID, ' execution error: ', statusCode, ' : ', data);
		}
	}
	cli.emit('send',{ "method":"POST", "resource":"/subscribe", "params": { "pairs":pairs }, "callback":callback })
}

var unsubscribe = (pairs) => {
	var callback = (statusCode, requestID, data) => {
		if (statusCode === 200) {
			try {
				var jsonData = JSON.parse(data);
			} catch (e) {
				console.log('unsubscribe request #', requestID, ' JSON parse error: ', e);
				return;
			}
			if(jsonData.response.executed) {
				try {
					for(var i in jsonData.pairs) {
						socket.removeListener(jsonData.pairs[i], priceUpdate);
					}
				} catch (e) {
					console.log('unsubscribe request #', requestID, ' "pairs" JSON parse error: ', e);
					return;
				}
			} else {
				console.log('unsubscribe request #', requestID, ' not executed: ', jsonData);
			}
		} else {
			console.log('unsubscribe request #', requestID, ' execution error: ', statusCode, ' : ', data);
		}
	}
	cli.emit('send',{ "method":"POST", "resource":"/unsubscribe", "params": { "pairs":pairs }, "callback":callback })
}
//
// end main functions
//

//
// begin module boilerplate
//
var cli;
var socket;
var initdone = false;

// called when the module is being loaded
exports.init = (c, s) => {
	if (!initdone) {
		cli = c;
		socket = s;
		setupCLI();
	}
	initdone = true;
}
//
// end module boilerplate
//

//
// end module boilerplate
//

///MainProcess update scubscription


///MainProcess update scubscription
function ProcessDataOnUpdate(jsonData) {

	jsonData.Rates = jsonData.Rates.map(function (element) {
		return element.toFixed(7);
	});

	let averangePrice = ((parseFloat(jsonData.Rates[0]) + parseFloat(jsonData.Rates[1])) / 2);

	close.push(averangePrice);

	if (close.length < TICKSave) {
		console.log("Recolecting data Wait... " + close.length);
	} else {
		close.shift();
		Indicator();
	}

	console.log(`@${jsonData.Updated} Price update of [${jsonData.Symbol}]: ${jsonData.Rates}`);

}

function Indicator() {

	let resultMACD = MACD.calculate({
		values: close,
		fastPeriod: 9,
		slowPeriod: 20,
		signalPeriod: 3,
		SimpleMAOscillator: false,
		SimpleMASignal: false
	});

	if ((resultMACD[resultMACD.length - 1].MACD) < (resultMACD[resultMACD.length - 1].signal)) {
		request_processor("POST","/trading/open_trade",{ 
			"account_id": main.config.accountID, 
			"symbol": "EUR/USD", 
			"is_buy":false,
			"at_market": 0,
			"order_type": "AtMarket",
			"stop": 30,
			"limit": 60,
			"is_in_pips":true,
			"amount":1,
			"time_in_force":"GTC" })
	} else {
		request_processor("POST","/trading/open_trade",{ 
			"account_id": main.config.accountID, 
			"symbol": "EUR/USD", 
			"is_buy":true,
			"at_market": 0,
			"order_type": "AtMarket",
			"stop": 30,
			"limit": 60,
			"is_in_pips":true,
			"amount":1,
			"time_in_force":"GTC" })
	}
	   
	console.log("MACD: " + resultMACD[resultMACD.length - 1].MACD + " Histogram: " + resultMACD[resultMACD.length - 1].histogram + " Signal: " + resultMACD[resultMACD.length - 1].signal);
}

function request_processor(method, resource, params, callback) {
	var requestID = getNextRequestID();
	if (typeof(callback) === 'undefined') {
		callback = main.default_callback;
		console.log('request #', requestID, ' sending');
	}
	if (typeof(method) === 'undefined') {
		method = "GET";
	}

	// GET HTTP(S) requests have parameters encoded in URL
	if (method === "GET") {
		resource += '/?' + params;
	}
	var req = tradinghttp.request({
			host: main.trading_api_host,
			port: main.trading_api_port,
			path: resource,
			method: method,
			headers: main.request_headers
		}, (response) => {
			var data = '';
			response.on('data', (chunk) => data += chunk); // re-assemble fragmented response data
			response.on('end', () => {
				callback(response.statusCode, requestID, data);
			});
		}).on('error', (err) => {
			callback(0, requestID, err); // this is called when network request fails
		});

	// non-GET HTTP(S) reuqests pass arguments as data
	if (method !== "GET" && typeof(params) !== 'undefined') {
		req.write(params);
	}
	req.end();
};