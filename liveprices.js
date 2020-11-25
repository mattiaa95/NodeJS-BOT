//
// begin setup CLI
//

var closes = []
const SMA = require('technicalindicators').SMA;
var MACD = require('technicalindicators').MACD;
var RSI = require('technicalindicators').RSI;


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
		ProcessDataOnUpdate(jsonData);
		
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



///MainProcess update scubscription

function ProcessDataOnUpdate(jsonData) {
	/*
	JavaScript floating point arithmetic is not accurate, so we need to round rates to 5 digits
	Be aware that .toFixed returns a String

	jsonData.Rates = jsonData.Rates.map(function (element) {
		return (parseFloat(element).toPrecision(12));
	});

	return element.toFixed(5);
	{
		Updated: 1606325180223,
		Rates: [
		  1.19132,
		  1.1914399999999998,
		  1.1930399999999999,
		  1.1881300000000001
		],
		Symbol: 'EUR/USD'
	  }
	 */
	jsonData.Rates = jsonData.Rates.map(function (element) {
		return element.toFixed(7);
	});
	let averangePrice = ((parseFloat(jsonData.Rates[0]) + parseFloat(jsonData.Rates[1])) / 2);
	closes.push(averangePrice);

	if (closes.length < 120) {
		console.log("Recolecting data Wait... " + closes.length);
	} else {
		closes.shift();
		var resultSMA = SMA.calculate({period : 10, values : closes})
		var resultRSI = RSI.calculate({period : 5, values : closes})

		var resultMACD = MACD.calculate({
			values            : closes,
			fastPeriod        : 5,
			slowPeriod        : 8,
			signalPeriod      : 3 ,
			SimpleMAOscillator: false,
			SimpleMASignal    : false
		  });

		console.log("SMA: " + resultSMA[resultSMA.length - 1])
		console.log("RSI: " + resultRSI[resultRSI.length - 1])
		console.log("MACD: " + resultMACD[resultMACD.length - 1].MACD + "Histogram: " + resultMACD[resultMACD.length - 1].histogram + "Signal: " + resultMACD[resultMACD.length - 1].signal)

	}

	console.log(`@${jsonData.Updated} Price update of [${jsonData.Symbol}]: ${jsonData.Rates} Averange price: ${averangePrice}`);

}