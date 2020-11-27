const TICKSave = 120; //Ticks que guarda antes de operar
exports.TICKSave = TICKSave;

const MaxOrders = 5; //Ordenes maximas abiertas simultaneamente, abre 1 cada tick maximo en el caso de no haber ninguna
exports.MaxOrders = MaxOrders;

const ADXperiod = 10; //ADX Period
exports.ADXperiod = ADXperiod;

const RSIperiod = 5; //RSI Period
exports.RSIperiod = RSIperiod;

// Example with RSI 40-60 only enter in 39 or 61 RSI
const RSIminLine = 35; // minimun bottom entrance RSI is the first IF
exports.RSIminLine = RSIminLine;

const RSImaxLine = 65; // minimum top entrance RSI is the first IF
exports.RSImaxLine = RSImaxLine;

//Example with 27 - 47 only enter in 28...46
const ADXmin = 30; //min adx entrance
exports.ADXmin = ADXmin;

const ADXmax = 45; //max adx entrance
exports.ADXmax = ADXmax;

//Order config
const StopLossinpips = -2; //stop loss in pips
exports.StopLossinpips = StopLossinpips;

const LimitGanaceinpip = 2.5; //limit win in pips
exports.LimitGanaceinpip = LimitGanaceinpip;