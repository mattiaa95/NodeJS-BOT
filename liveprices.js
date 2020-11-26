//
// begin setup CLI
//
const MACD = require('technicalindicators').MACD;
const ADX = require('technicalindicators').ADX;
const TICKSave = 120;
const MaxOrders = 5;
var close = []
var sell = []
var buy = []
var orders = 0
var config = require('./config.js');

var tradinghttp = require(config.trading_api_proto);
var querystring = require('querystring');
const { Console } = require('console');

var headers = {
	'User-Agent': 'request',
	'Accept': 'application/json',
	'Content-Type': 'application/x-www-form-urlencoded'
}

var setupCLI = () => {
	cli.on('price_subscribe', (params) => {
		if (typeof (params.pairs) === 'undefined') {
			console.log('command error: "pairs" parameter is missing.');
		} else {
			subscribe(params.pairs);
		}
	});
}
//
// end setup CLI
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
			if (jsonData.response.executed) {
				try {
					for (var i in jsonData.pairs) {
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
	cli.emit('send', { "method": "POST", "resource": "/subscribe", "params": { "pairs": pairs }, "callback": callback })
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
	sell.push(parseFloat(jsonData.Rates[0]))
	buy.push(parseFloat(jsonData.Rates[1]))

	if (close.length < TICKSave) {
		console.log("Recolecting data Wait... " + close.length);
	} else {
		close.shift();
		sell.shift();
		buy.shift();
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

	let resultADX = ADX.calculate({
		close: close,
		high: buy,
		low: sell,
		period: 10
	});

	if (orders < MaxOrders) {
		//
		if (resultADX[resultADX.length - 1].adx >= 30 && resultADX[resultADX.length - 1].adx <= 50) {
			if ((resultMACD[resultMACD.length - 1].MACD) < (resultMACD[resultMACD.length - 1].signal)) {
				request_processor("POST", "/trading/open_trade", {
					"account_id": config.accountID,
					"symbol": "EUR/USD",
					"is_buy": false,
					"at_market": 0,
					"order_type": "AtMarket",
					"is_in_pips": true,
					"stop": -1.5,
					"limit": 2.5,
					"amount": 10,
					"time_in_force": "GTC"
				})
			} else {
				request_processor("POST", "/trading/open_trade",
					{
						"account_id": config.accountID,
						"symbol": "EUR/USD",
						"is_buy": true,
						"at_market": 0,
						"order_type": "AtMarket",
						"is_in_pips": true,
						"stop": -1.5,
						"limit": 2.5,
						"amount": 10,
						"time_in_force": "GTC"
					})
			}
		}

	}
	console.log("ADX: " + resultADX[resultADX.length - 1].adx)
	console.log("MACD: " + resultMACD[resultMACD.length - 1].MACD + " Histogram: " + resultMACD[resultMACD.length - 1].histogram + " Signal: " + resultMACD[resultMACD.length - 1].signal);
}

function request_processor(method, resource, params) {
	orders = orders + 1
	// GET HTTP(S) requests have parameters encoded in URL
	if (method === "GET") {
		resource += '/?' + querystring.stringify(params);
	}

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
			try {
				var jsonData = JSON.parse(response)
			} catch (e) {
				console.log('JSON parse error:', e);
				return;
			}

			try {
				//ORDER DONE
				if (jsonData.orderId > 0) {
					request_processor("GET", "/trading/get_model", { "models": "OpenPosition" })
					console.log("orderDone: " + response.statusCode + " " + data)
				}
			} catch (error) {
				console.log(error)
			}

			try {
				//GET orders
				if (jsonData.open_positions.length > 0) {
					console.log("ORDERS OPEN: " + jsonData.open_positions.length)
					orders = jsonData.open_positions.length
				}
			} catch (error) {
				console.log(error)
			}

		});
	}).on('error', (err) => {
		console.log(err.message)
	});

	if (method !== "GET" && typeof (params) !== 'undefined') {
		req.write(querystring.stringify(params));
	}

	req.end();
};
