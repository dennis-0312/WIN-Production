/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 */
define(["N/query"], function (query) {
    return {
      get: function (context) {
        var fechaParam = context.fecha; // Obtener el parámetro de fecha de la solicitud
  
        // Verificar si se proporcionó un parámetro de fecha
        // Obtener la fecha actual en formato 'YYYY-MM-DD'
        var currentDate = new Date();
        var year = currentDate.getFullYear();
        var month = ("0" + (currentDate.getMonth() + 1)).slice(-2);
        var day = ("0" + currentDate.getDate()).slice(-2);
        var formattedDate = year + "-" + month + "-" + day;
  
        var sql =
        "SELECT " +
        " cr.id, b.symbol as basecurrency, c.symbol as transactioncurrency,  cr.effectivedate, cr.exchangerate, TO_CHAR(cr.lastModifiedDate, 'YYYY-MM-DD HH24:MI:SS') as lastModifiedDate" +
        " FROM " +
        " currencyrate cr" +
        " JOIN currency c ON cr.transactioncurrency = c.id" +
        " JOIN currency b ON cr.basecurrency = b.id" +
        " WHERE cr.effectivedate <= TO_DATE('" +
        (fechaParam || formattedDate) +
        "', 'YYYY-MM-DD')" +
        " AND (cr.basecurrency, cr.transactioncurrency, cr.effectivedate) IN (" +
        "     SELECT cr2.basecurrency, cr2.transactioncurrency, MAX(cr2.effectivedate)" +
        "     FROM currencyrate cr2" +
        "     WHERE cr2.effectivedate <= TO_DATE('" +
        (fechaParam || formattedDate) +
        "', 'YYYY-MM-DD')" +
        "     GROUP BY cr2.basecurrency, cr2.transactioncurrency" +
        " )" +
        " ORDER BY cr.lastModifiedDate DESC"; // Ordenar por lastModifiedDate en orden descendente
  
        var results = query
          .runSuiteQL({
            query: sql,
          })
          .asMappedResults();
        
        // Filtrar los resultados para mantener solo los últimos registros de cada combinación única de basecurrency y transactioncurrency
        var uniqueRecords = {};
        results.forEach(function(record) {
            var key = record.basecurrency + '-' + record.transactioncurrency;
            if (!(key in uniqueRecords) || record.lastModifiedDate > uniqueRecords[key].lastModifiedDate) {
                uniqueRecords[key] = record;
            }
        });
        
        var uniqueRecordsArray = Object.values(uniqueRecords);
        var resultsJson = JSON.stringify(uniqueRecordsArray);
  
        return resultsJson;
      },
    };
  });
  