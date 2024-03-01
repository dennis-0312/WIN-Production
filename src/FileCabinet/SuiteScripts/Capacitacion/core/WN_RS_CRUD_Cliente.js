/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
*/

define(['N/log', 'N/record', 'N/currency'], function (log, record, currency) {
    return {
        get: function (context) {
          return "Hello World! 2026"
            var canadianAmount = 100;
            var rate = currency.exchangeRate({
                source: 'CAD',
                target: 'USD',
                date: new Date('10/10/2023')
            });
    
            var usdAmount = canadianAmount * rate;
            return usdAmount;
        }
        // post: function (context) {
        //     return "Hello World! 2026"
        //     var canadianAmount = 100;
        // }
    }
});