/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * Task                         Date            Author                                      Remarks
 * ANUAL: Formato 3.9                  28 Ago 2023     Giovana Guadalupe <giovana.guadalupe@myevol.biz>          LIBRO CAJA Y BANCOS - DETALLE DE LOS MOVIMIENTOS DEL EFECTIVO
 */
define(["N/runtime", "N/search", "N/config", "N/render", "N/record", "N/file", "./PE_LIB_Libros.js", "N/format"], (runtime, search, config, render, record, file, libPe, format) => {
  var objContext = runtime.getCurrentScript();

  /** PARAMETROS */
  var pGloblas = {};

  /** REPORTE */
  var formatReport = "pdf";
  var nameReport = "";
  var transactionFile = null;
  var d = new Date();
  var fechaHoraGen = d.getDate() + "" + (d.getMonth() + 1) + "" + d.getFullYear() + "" + d.getHours() + "" + d.getMinutes() + "" + d.getSeconds();

  /** DATOS DE LA SUBSIDIARIA */
  var companyName = "";
  var companyRuc = "";
  var companyLogo = "";
  var companyDV = "";

  var featureSTXT = null;
  var featMultibook = null;
  var featSubsidiary = null;

  const getInputData = () => {
    log.debug("Inicio");
    try {
      getParameters();

      return getTransactions();
    } catch (e) {
      log.error("[ Get Input Data Error ]", e);
    }
  };

  const map = (context) => {
    try {
      var key = context.key;
      var dataMap = JSON.parse(context.value);
      // log.debug("dataMap", dataMap);
      // log.debug("key", key);

      var resultTransactions = {
        key: key,
        fechaInicio: dataMap[0],
        descripcion: dataMap[1],
        tipo: dataMap[2],
        valorContable: dataMap[3],
        amortizacion: dataMap[4],
        valorNeto: dataMap[5],
      };

      context.write({
        key: key,
        value: resultTransactions,
      });
    } catch (e) {
      log.error("[ Map Error ]", e);
    }
  };

  const summarize = (context) => {
    // log.debug("Entro al summarize");
    getParameters();
    getSubdiary();

    pGloblas["pRecordID"] = libPe.createLog(pGloblas.pSubsidiary, pGloblas.anioCon, "Formato3.9");

    var transactionJSON = {};

    transactionJSON["parametros"] = pGloblas;

    transactionJSON["transactions"] = {};
    context.output.iterator().each(function (key, value) {
      value = JSON.parse(value);
      // log.debug("value", value);
      transactionJSON["transactions"][value.key] = value;
      return true;
    });
    // log.debug("transactionJSON", transactionJSON["transactions"]);

    var jsonAxiliar = getJsonData(transactionJSON["transactions"]);

    // log.debug("jsonAxiliarFinal", jsonAxiliar);
    //Validamos que TrnsactionJSON.accounts no este vacio para todos los ambientes
    if (!isObjEmpty(transactionJSON["transactions"])) {
      var renderer = render.create();

      renderer.templateContent = getTemplate();

      renderer.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: "input",
        data: {
          data: JSON.stringify(jsonAxiliar),
        },
      });

      /**** *
      stringXML2 = renderer.renderAsString();

      var FolderId = FOLDER_ID;

      if (FolderId != "" && FolderId != null) {
        // Crea el archivo
        var fileAux = file.create({
          name: "AuxiliarFormato3.9",
          fileType: file.Type.PLAINTEXT,
          contents: stringXML2,
          encoding: file.Encoding.UTF8,
          folder: FolderId,
        });

        var idfile = fileAux.save(); // Termina de grabar el archivo

        log.debug({
          title: "URL ARCHIVO TEMP",
          details: idfile,
        });
      }

      *** */
      stringXML = renderer.renderAsPdf();
      saveFile(stringXML);

      /**** */
      log.debug("Termino");
      return true;
    } else {
      log.debug("No data");
      libPe.noData(pGloblas.pRecordID);
    }
  };

  const getJsonData = (transactions) => {
    let userTemp = runtime.getCurrentUser(),
      useID = userTemp.id,
      jsonTransacion = {},
      totalAmount = 0,
      totalAmount2 = 0,
      totalAmount3 = 0;
    

    var employeeName = search.lookupFields({
      type: search.Type.EMPLOYEE,
      id: useID,
      columns: ["firstname", "lastname"],
    });
    var userName = employeeName.firstname + " " + employeeName.lastname;

    // log.debug("transactions", transactions);

    for (var k in transactions) {
      let IDD = transactions[k].key;
      if (!jsonTransacion[IDD]) {
        let valorContable = Number(transactions[k].valorContable).toFixed(2);
        let amortizacion = Number(transactions[k].amortizacion).toFixed(2);
        let valorNeto = Number(transactions[k].valorNeto).toFixed(2);

        jsonTransacion[IDD] = {
          fechaInicio: transactions[k].fechaInicio,
          descripcion: transactions[k].descripcion,          
          tipo: transactions[k].tipo,
          valorContable: valorContable,
          amortizacion: amortizacion,
          valorNeto: valorNeto,
        };
        totalAmount = totalAmount + Number(transactions[k].valorContable);
        totalAmount2 = totalAmount2 + Number(transactions[k].amortizacion);
        totalAmount3 = totalAmount3 + Number(transactions[k].valorNeto);
      }
    }


    let periodSearch = search.lookupFields({
      type: search.Type.ACCOUNTING_PERIOD,
      id: pGloblas.pPeriod,
      columns: ["periodname"],
    });
    log.debug("periodSearch", periodSearch);

    let periodname = periodSearch.periodname.split(" ");

    let jsonAxiliar = {
      company: {
        formato: 'FORMATO 3.9: "LIBRO DE INVENTARIOS Y BALANCES - DETALLE DEL SALDO DE LA CUENTA 34 - INTANGIBLES"',
        ejercicio: "EJERCICIO: " +pGloblas.pAnio,
        ruc: "RUC: " + companyRuc,
        name: "RAZÓN SOCIAL: " + companyName.replace(/&/g, "&amp;").toLocaleUpperCase(),
        firtTitle: companyName.replace(/&/g, "&amp;"),
        secondTitle: "Expresado en Moneda Nacional",
        thirdTitle: "COMPROBANTES DE RETENCION - " + periodSearch.periodname,
      },
      total: {
        total: totalAmount.toFixed(2),
        total2: totalAmount2.toFixed(2),
        total3: totalAmount3.toFixed(2),
      },
      movements: jsonTransacion,
    };

    return jsonAxiliar;
  };

  const saveFile = (stringValue) => {
    var fileAuxliar = stringValue;
    var urlfile = "";
    if (featSubsidiary) {
      // nameReport = "Formato 3.9_" + companyName +"_"+ fechaHoraGen + "." + formatReport;
      nameReport = "Formato 3.9_" + companyName + "." + formatReport;
    } else {
      nameReport = "Formato 3.9_" + "_" + fechaHoraGen +"." + formatReport;
    }

    var folderID = libPe.callFolder();

    fileAuxliar.name = nameReport;
    fileAuxliar.folder = folderID;

    var fileID = fileAuxliar.save();

    let auxFile = file.load({
      id: fileID,
    });
    log.debug("auxFile", auxFile);
    urlfile += auxFile.url;

    // log.debug("pGloblas.pRecordID", pGloblas.pRecordID);
    libPe.loadLog(pGloblas.pRecordID, nameReport, urlfile);
  };

  const getTemplate = () => {
    var aux = file.load("./Template/PE_Template_3_9_DetIntang.xml");
    return aux.getContents();
  };

  const getTransactions = () => {
    var arrResult = [];
    var _cont = 0;

    // FORMATO 3.9: "LIBRO DE INVENTARIOS Y BALANCES - DETALLE DEL SALDO DE LA CUENTA 34 - INTANGIBLES"
    var savedSearch = search.load({
      id: "customsearch_pe_detalle_34_3_9",
    });

    log.debug("pGloblas.pSubsidiary", pGloblas.pSubsidiary);
    if (featSubsidiary) {
      savedSearch.filters.push(
        search.createFilter({
          name: "subsidiary",
          operator: search.Operator.IS,
          values: pGloblas.pSubsidiary,
        })
      );
    }

    var pagedData = savedSearch.runPaged({
      pageSize: 1000,
    });

    var page, columns;

    pagedData.pageRanges.forEach(function (pageRange) {
      page = pagedData.fetch({
        index: pageRange.index,
      });

      page.data.forEach(function (result) {
        columns = result.columns;
        arrAux = new Array();

        // log.debug("result", result);        

        // 0. FECHA DE INICIO DE LA OPERACIÓN
        arrAux[0] = result.getValue(columns[0]);
        // arrAux[0] = "";

        // 1. DESCRIPCIÓN DEL INTANGIBLE
        arrAux[1] = result.getValue(columns[1]);

        // 2. TIPO DE INTANGIBLE (TABLA 7)
        arrAux[2] = result.getValue(columns[2]);

        // 3. VALOR CONTABLE DEL INTANGIBLE
        arrAux[3] = result.getValue(columns[3]);

        // 4. AMORTIZACIÓN CONTABLE ACUMULADA
        arrAux[4] = result.getValue(columns[4]);

        // 5. VALOR NETO CONTABLE DEL INTANGIBLE
        arrAux[5] = result.getValue(columns[5]);

        let year = arrAux[0].split("/")[2];

        if (year == pGloblas.pAnio) {
            arrResult.push(arrAux);
        }

        // arrResult.push(arrAux);
      });
    });
    //!DATA PRUEBA - Inicio
    // for(var i=0;i<10;i++){
    //     arrAux = new Array();
    //     arrAux[0] = '30/06/2023'
    //     arrAux[1] = 'Bill Credit'
    //     arrAux[2] = '01'
    //     arrAux[3] = '100.00'
    //     arrAux[4] = '0.00'
    //     arrAux[5] = '100.00'
    //     arrResult.push(arrAux);
    // }
    //!DATA PRUEBA - Fin

    return arrResult;
  };

  const getSubdiary = () => {
    if (featSubsidiary) {
      log.debug(pGloblas.pSubsidiary, pGloblas.pSubsidiary);
      var dataSubsidiary = record.load({
        type: "subsidiary",
        id: pGloblas.pSubsidiary,
      });
      companyName = dataSubsidiary.getValue("legalname");
      companyRuc = dataSubsidiary.getValue("federalidnumber");
    } else {
      companyName = config.getFieldValue("legalname");
    }
  };

  const getParameters = () => {
    pGloblas = objContext.getParameter("custscript_pe_3_9_detintang_params"); // || {};
    pGloblas = JSON.parse(pGloblas);
    // pGloblas = {
    //   recordID: 10, reportID: 10, subsidiary: 3, anioCon: "2023", periodCon: 113 };

    pGloblas = {
      pRecordID: pGloblas.recordID,
      pFeature: pGloblas.reportID,
      pSubsidiary: pGloblas.subsidiary,
      pAnio: pGloblas.anioCon,
      pPeriod: pGloblas.periodCon,
    };
    log.debug("pGloblas", pGloblas);

    featSubsidiary = runtime.isFeatureInEffect({ feature: "SUBSIDIARIES" });
  };

  const isObjEmpty = (obj) => {
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) return false;
    }

    return true;
  };
    
  function CompletarCero(tamano, valor) {
      var strValor = valor + '';
      var lengthStrValor = strValor.length;
      var nuevoValor = valor + '';

      if (lengthStrValor <= tamano) {
          if (tamano != lengthStrValor) {
              for (var i = lengthStrValor; i < tamano; i++){
                  nuevoValor = '0' + nuevoValor;
              }
          }
          return nuevoValor;
      } else {
          return nuevoValor.substring(0,tamano);
      }
  }

  return {
    getInputData: getInputData,
    map: map,
    // reduce: reduce,
    summarize: summarize,
  };
});
