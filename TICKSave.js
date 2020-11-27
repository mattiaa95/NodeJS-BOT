const TICKSave = 120; //Ticks que guarda antes de operar
exports.TICKSave = TICKSave;

const MaxOrders = 25; //Ordenes maximas abiertas simultaneamente, abre 1 cada tick maximo en el caso de no haber ninguna
exports.MaxOrders = MaxOrders;

const ADXperiod = 10; //ADX Period
exports.ADXperiod = ADXperiod;

//Example with 27 - 47 only enter in 28...46
const ADXmin = 35; //min adx entrance
exports.ADXmin = ADXmin;

//Order config
const StopLossinpips = -1.5; //stop loss in pips
exports.StopLossinpips = StopLossinpips;

const LimitGanaceinpip = 2.5; //limit win in pips
exports.LimitGanaceinpip = LimitGanaceinpip;

const SMA4Period = 4;
exports.SMA4Period = SMA4Period;

const SMA20Period = 20;
exports.SMA20Period = SMA20Period;

const SMAAbsoluteDiference = 0.00016;
exports.SMAAbsoluteDiference = SMAAbsoluteDiference;

