//
// begin setup CLI
//
const MACD = require('technicalindicators').MACD;
const TICKSave = 120;
var close = []
var config = require('./config.js');

var tradinghttp = require(config.trading_api_proto);
var querystring = require('querystring');

var headers = {
	'User-Agent': 'request',
	'Accept': 'application/json',
	'Content-Type': 'application/x-www-form-urlencoded'
}

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
exports.init = (c, s, h) => {
	if (!initdone) {
		cli = c;
		socket = s;
		headers = h;
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
		Indicator(jsonData);
	}

	console.log(`@${jsonData.Updated} Price update of [${jsonData.Symbol}]: ${jsonData.Rates}`);

}

function Indicator(jsonData) {
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
			"account_id": config.accountID, 
			"symbol": "EUR/USD", 
			"is_buy": false,
			"at_market": 0,
			"order_type": "AtMarket",
			"stop": (parseFloat(jsonData.Rates[0])*0.01),
			"limit": (parseFloat(jsonData.Rates[0])-(parseFloat(jsonData.Rates[0])*0.002)),
			"amount": 10,
			"time_in_force":"GTC" })
	} else {
		request_processor("POST","/trading/open_trade",
		{"account_id": config.accountID, 
			"symbol": "EUR/USD", 
			"is_buy": true,
			"at_market": 0,
			"order_type": "AtMarket",
			"stop": (parseFloat(jsonData.Rates[1])-(parseFloat(jsonData.Rates[1])*0.01)),
			"limit": (parseFloat(jsonData.Rates[1])*0.002),
			"amount": 10,
			"time_in_force":"GTC" })
	}
	   
	console.log("MACD: " + resultMACD[resultMACD.length - 1].MACD + " Histogram: " + resultMACD[resultMACD.length - 1].histogram + " Signal: " + resultMACD[resultMACD.length - 1].signal);
}

function request_processor(method, resource, params) {
	console.log(params.is_buy)
	var req = tradinghttp.request({
			host: config.trading_api_host,
			port: config.trading_api_port,
			path: resource,
			method: method,
			headers: headers
			}, (response) => {
			var data = '';
			response.on('data', (chunk) => data += chunk); // re-assemble fragmented response data
			response.on('end', () => {
				console.log("orderDone: " + response.statusCode +" "+ data)
			});
		}).on('error', (err) => {
			console.log(err.message)
		});

		if (method !== "GET" && typeof(params) !== 'undefined') {
			req.write(querystring.stringify(params));
		}

	req.end();
};
