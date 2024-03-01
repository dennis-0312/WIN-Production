<#setting locale="en_US">
<#assign data = input.data?eval >
<#assign company = data.company >
<#assign cabecera = data.cabecera >
<#assign total = data.total >
<#assign movements = data.movements >
<#assign jsonTransacionvine = data.jsonTransacionvine >
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE pdf PUBLIC "-//big.faceless.org//report" "report-1.1.dtd">
<pdf>
   <head>

      <meta name="title" value="Formato 3.5" />
      <macrolist>
         <macro id = "cabecera">
            <table width="100%">
               <tr>
                  <td colspan="3" align="center" style= "font-weight: bold;">FORMATO 3.5: "LIBRO DE INVENTARIOS Y BALANCES - DETALLE DEL SALDO DE LA CUENTA 16 - CUENTAS POR COBRAR DIVERSAS"</td>
               </tr>
               <tr>
                  <td width="30%" align="left" style= "font-weight: bold;">EJERCICIO</td>
                  <td width="5%" align="left" style= "font-weight: bold;">:</td>
                  <td width="65%" align="left">${cabecera.Anio}</td>
               </tr>
               <tr>
                  <td width="30%" align="left" style= "font-weight: bold;">RUC</td>
                  <td width="5%" align="left" style= "font-weight: bold;">:</td>
                  <td width="65%" align="left">${cabecera.ruc}</td>
               </tr>
               <tr>
                  <td width="30%" align="left" style= "font-weight: bold;">RAZON SOCIAL</td>
                  <td width="5%" align="left" style= "font-weight: bold;">:</td>
                  <td width="65%" align="left">${cabecera.razonSocial}</td>
               </tr>
            </table>
         </macro>
      </macrolist>
   </head>
   <body background-color="white" font-size="8" size="A4-landscape" header = "cabecera" header-height="30mm" footer-height="10mm">
      <table style="font-family: Verdana, Arial, Helvetica, sans-serif; width:100%" >
         <thead>
         <tr>
            <td colspan="3" align = "center " style= "border-left: 1px solid black; border-top: 1px solid black; font-weight:bold; vertical-align: middle; text-align: center;">INFORMACIÓN DE TERCEROS</td>
            <td rowspan="3" align = "center " style= "border-left: 1px solid black; border-top: 1px solid black; border-bottom: 1px solid black; vertical-align: middle; font-weight:bold">
              <table>
                <tr>
                  <td align="center" style="text-align:center;">FECHA DE EMISIÓN DEL COMPROBANTE DE</td>
                </tr>
                <tr>
                  <td align="center" style="text-align:center;">PAGO O FECHA DE INICIO DE LA OPERACIÓN</td>
                </tr>
              </table>
            </td>
            <td rowspan="3" align = "center " style= "border: 1px solid black; font-weight:bold; vertical-align: middle;">MONTO DE LA CUENTA POR COBRAR</td>
         </tr>
         <tr>
            <td colspan="2" align = "center " style= "border-left: 1px solid black; border-top: 1px solid black; font-weight:bold; vertical-align: middle; text-align: center;">DOCUMENTO DE IDENTIDAD</td>
            <td rowspan="2" align = "center " style= "border-left: 1px solid black; border-top: 1px solid black; border-bottom: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">
              <table>
                <tr>
                  <td align="center" style="text-align:center;">APELLIDOS Y NOMBRES,</td>
                </tr>
                <tr>
                  <td align="center" style="text-align:center;">DENOMINACIÓN O RAZÓN SOCIAL</td>
                </tr>
              </table>             
            </td>
         </tr>
         <tr>
            <td align = "center " style= "border-left: 1px solid black; border-top: 1px solid black; border-bottom: 1px solid black; font-weight:bold; vertical-align: middle; text-align: center;">TIPO (TABLA 2)</td>
            <td align = "center " style= "border-left: 1px solid black; border-top: 1px solid black; border-bottom: 1px solid black; vertical-align: middle; font-weight:bold; text-align: center;">NÚMERO</td>
         </tr>
         </thead>
         <tbody>
         <#list movements as key,mov>
            <tr>
               <td align = "center ">${mov.tipoDocumento}</td>
               <td align = "center ">${mov.numeroDocumento}</td>
               <td align = "center ">${mov.razonSocial}</td>
               <td align = "center ">${mov.fechaInicio}</td>
               <td align = "right ">${mov.montoCtaCobrar?string["#,###.00"]}</td>
            </tr>
            <#list jsonTransacionvine as item>
                   <#if mov.number == item.cantidadFor>
                     <tr>
                        <td align = "center "></td>
                        <td align = "center "></td>
                           <td align = "center ">VAN</td>
                           
                        <td align = "center "></td>
                        <td align = "right ">${item.montoviene}</td>
                     </tr>
                  
                     <tr>
                        <td align = "center "></td>
                        <td align = "center "></td>
                                <td align = "center ">VIENE</td>
                               
                        <td align = "center "></td>
                        <td align = "right ">${item.montoviene}</td>
                     </tr>
                  </#if>
            </#list>
         </#list>
            <tr>
               <td align = "center " style= "border-top:1px solid black"></td>
               <td align = "center " style= "border-top:1px solid black"></td>
               <td align = "center " style= "border-top:1px solid black"></td>
               <td align = "right " style= "font-weight:bold; border-top:1px solid black">SALDO FINAL TOTAL</td>
               <td align = "right " style= "font-weight:bold; border-top:1px solid black">${total.totalMonto?string["#,###.00"]}</td>
            </tr>
         </tbody>
      </table>  
  </body>
</pdf>