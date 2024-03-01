/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
*/

define(['N/currency'], function (currency) {
    return {
        get: function (context) {
          var source = context.source;
          var target = context.target;
          var date = context.date;
          var partes = date.split('-');
          var dia = partes[0];
          var mes = partes[1];
          var anio = partes[2];
          var fechaFormateada = mes + '/' + dia + '/' + anio;

          var tipoCambio = currency.exchangeRate({
                source: source,
                target: target,
                date: new Date(fechaFormateada),
            });
          
          return {
            source: source,
            target: target,
            date: date,
            tipoCambio: tipoCambio,
          };
        }
    }
});