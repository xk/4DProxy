#!/usr/bin/env node

// 2012-05-01 4DProxy_2.js  investigando la lentitud

var ok= process.argv.length > 3;

if (ok) {
  var args= process.argv.slice(2).sort();
  var params= Object.create(null);
  while (args.length) {
    var e= args.pop().split(':');
    params[e[0]]= e[1];
  }
  ok= ('sip' in params) && ('pp' in params);
}

if (!ok) {
  console.log("*******************\n* 4D PROXY SERVER *\n*******************\n\n2011-06-15 jorge@jorgechamorro.com\n\nEste programa sirve para dos cosas:\n- Una es mostrar el orden en que se producen las solicitudes y las respuestas entre un cliente 4D y un servidor 4D conectados por tcp/ip.\n- La otra es introducir una latencia (expresada entre milisegundos) a cada paquete que se envía y a cada paquete que se recibe.\n\nNecesita 4 parámetros para funcionar:\n\nlat:ms    -> los milisegundos de latencia que hay que añadir (por defecto 0)\nsip:ip    -> la IP del servidor 4D remoto.\nsp:puerto -> el puerto del servidor 4D remoto (por defecto 19813).\npp:puerto del proxy -> el puerto al que hay que conectarse para acceder a través del proxy.\ndata:len -> el número de caracteres que se quiere mostrar en data: (por defecto todos)\n\nPor ejemplo, para arrancar este proxy en el puerto 12345 de este ordenador, y hacer que se conecte a un servidor 4D que esté en la IP 10.0.0.1 en el puerto 19813, añadiendo una latencia de 50 ms habrá que teclear:\n\nnode 4dproxy.js pp:12345 sip:10.0.0.1 sp:19813 lat:50\n\nEl orden de los parámetros no importa.\nSi no se especifica lat: se supone que es 0.\nSi no se especifica sp: se supone que es 19813\nSi no se especifica data: (o si es cero) se muestran todos los datos de cada paquete\n\n");
  return;
}

var net= require('net');

var lat= (params.lat= (parseInt(params.lat, 10) || 0));
var sp= (params.sp= (parseInt(params.sp, 10) || 19813));
var sip= (params.sip= (params.sip || '0.0.0.0'));
var pp= (params.pp= (parseInt(params.pp, 10) || 0));
var datalen= (params.data= (parseInt(params.data, 10) || 0));
console.log(params);

var offset= sp- pp;
[pp-1, pp, pp+1].forEach(function (port) {
  try {
    net.createServer(clientConnection).listen(port);
    console.log('Listening on localhost:'+ port+ " <-> "+ sip+ ":"+ (port+offset));
  }
  catch (e) {}
});

var time_0= Date.now();
var ctr= 0;
var conexiones= 0;
function clientConnection (clientSocket) {
  
  //Cada vez que conecte al proxy un cliente 4D, se ejecuta esta función.
  var puerto= clientSocket.address().port;
  var numero= conexiones++;
  
  var clientBuffer= [];
  var serverBuffer= [];
  
  //Abrimos una nueva conexión al 4D Server. Lo que llegue del cliente 4D se mandará al 4D Server, y viceversa.
  var serverSocket= net.createConnection(puerto+offset, sip);
  
  serverSocket.on('connect', function () {
    //Esto sólo se ejecuta si se consigue conectar al 4D Server.
    console.log('  ['+ numero+ '] **** NUEVA CONEXION : ['+ puerto+ ' <-> '+ (puerto+offset)+ ']');
  });
  
  
  serverSocket.on('data', function (data) {
    // Esto se ejecuta cada vez que se recibe un paquete de datos del servidor 4D.
    // Lo que nos llega del server lo metemos en un buffer para enviarlo al cliente.
    clientBuffer.push({data:data, t:Date.now()+lat});
    if (!writer.timer) writer.timer= setTimeout(writer, lat);
    display('i', data);
  });
  
  
  clientSocket.on('data', function (data) {
    // Esto se ejecuta cada vez que se recibe un paquete de datos del cliente 4D.
    // Lo que nos llega del cliente lo metemos en un buffer para enviarlo al server.
    serverBuffer.push({data:data, t:Date.now()+lat});
    if (!writer.timer) writer.timer= setTimeout(writer, lat);
    display('o', data);
  });
  
  clientSocket.on('end', function () {
    //El cliente 4D ha desconectado del proxy. Hemos de desconectar del 4D Server también.
    serverSocket.destroy();
    clientSocket= serverSocket= undefined;
    console.log('  ['+ numero+ '] **** SE HA DESCONECTADO');
  });
  
  
  function display (prefijo, data) {
    var str;
    if (datalen) {
      str= data.toString('ascii', 0, datalen);
    }
    else {
      str= data.toString('ascii');
    }
    str= str.replace(/\W/g, ".");
    console.log(prefijo+ ' ['+ numero+ '] t:'+ ((Date.now()-time_0)/1000).toFixed(1)+ 's #'+ (ctr++)+ ' L:'+ data.length+ ' data:'+ str);
  }
  
  
  //writer() envía a sus destinos el contenido de los buffers.
  function writer () {
    var t= 0;
    var now= Date.now();
    
    if (serverSocket) {
      while (serverBuffer.length) {
        if (serverBuffer[0].t > now) {
          t= serverBuffer[0].t;
          break;
        }
        serverSocket.write(serverBuffer.shift().data);
      }
    }
    
    if (clientSocket) {
      while (clientBuffer.length) {
        if  (clientBuffer[0].t > now) {
          t= t ? Math.min(t, clientBuffer[0].t) : clientBuffer[0].t;
          break;
        }
        clientSocket.write(clientBuffer.shift().data);
      }
    }
    
    if (t) {
      t-= Date.now();
      t= (t > 0) ? t : 0;
      if (t) {
        writer.timer= setTimeout(writer, t);
        //console.log('*************************************************** setTimeout(writer, '+ t+ ')');
      }
      else {
        process.nextTick(writer);
        writer.timer= 1;
        //console.log('*************************************************** process.nextTick(writer)');
      }
    }
    else {
      writer.timer= 0;
    }
  }
}

