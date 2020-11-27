//
// begin setup CLI
//
const SMA = require('technicalindicators').SMA;
const ADX = require('technicalindicators').ADX;

var close = []
var sell = []
var buy = []
var spread = 1
var orders = 0
var config = require('./config.js');

var pair = ""

var tradinghttp = require(config.trading_api_proto);
var querystring = require('querystring');
const { Console } = require('console');

const { TICKSave, ADXperiod, MaxOrders, ADXmin, StopLossinpips, LimitGanaceinpip,SMA4Period, SMA20Period,SMADiference } = require("./TICKSave");

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
	pair = pairs
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
		return element.toFixed(5);
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

	spread = ((buy[buy.length - 1] - sell[sell.length - 1]).toFixed(5)*10000)
	console.log(`@${jsonData.Updated} Price update of [${jsonData.Symbol}]: ${jsonData.Rates} | Spread(pips): ${spread}`);
}


function Indicator() {

	let resultSMA4 = SMA.calculate({period : SMA4Period, values : close});
	let resultSMA20 = SMA.calculate({period : SMA20Period, values : close});

	let resultADX = ADX.calculate({
		close: close,
		high: buy,
		low: sell,
		period: ADXperiod
	});

	if (orders < MaxOrders) {
			if (resultADX[resultADX.length - 1].adx >= ADXmin) {
				if (resultSMA4[resultSMA4.length - 1] < ((resultSMA20[resultSMA20.length - 1])*SMADiference)) {
					console.log("Make Sell trade")
					request_processor("POST", "/trading/open_trade", {
						"account_id": config.accountID,
						"symbol": pair,
						"is_buy": false,
						"at_market": 0,
						"order_type": "AtMarket",
						"is_in_pips": true,
						"trailing_step": 0.1,
						"stop": StopLossinpips + -(spread),
						"limit": LimitGanaceinpip + spread,
						"amount": 10,
						"time_in_force": "GTC"
					})
				} else {
					console.log("Make Buy trade")
					request_processor("POST", "/trading/open_trade",
						{
							"account_id": config.accountID,
							"symbol": pair,
							"is_buy": true,
							"at_market": 0,
							"order_type": "AtMarket",
							"is_in_pips": true,
							"trailing_step": 0.1, // 1 - for dynamic --- 10 or above - for fixed trailing stop
							"stop": StopLossinpips + -(spread),
							"limit": LimitGanaceinpip + spread,
							"amount": 10,
							"time_in_force": "GTC"
						})
				}
			}
	}else{
		request_processor("GET", "/trading/get_model", { "models": "OpenPosition" })
	}

	console.log("resultSMA4: " + resultSMA4[resultSMA4.length - 1])
	console.log("resultSMA20: " + resultSMA20[resultSMA20.length - 1])
	console.log("ADX: " + resultADX[resultADX.length - 1].adx)
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
			if (response.statusCode === 200) {
				try {
					var jsonData = JSON.parse(data);
				} catch (e) {
					console.log('JSON parse error: ', e);
					return;
				}
				if (jsonData.response.executed) {
					try {
						//GET orders
						if (jsonData.open_positions.length > 0) {
							console.log("ORDERS OPEN: " + (jsonData.open_positions.length - 1))
							orders = (jsonData.open_positions.length - 1)
						}
					} catch (e) {
						console.log('length error: Open new Trade');
					}
				}
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
