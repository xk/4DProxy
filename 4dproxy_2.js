#!/usr/bin/env node

// 2012-05-01 4DProxy_2.js  investigando la lentitud

var ok= process.argv.length > 5;

if (ok) {
  var args= process.argv.slice(2).sort();
  var params= Object.create(null);
  while (args.length) {
    var e= args.pop().split(':');
    params[e[0]]= e[1];
  }
  ok= ('lat' in params) && ('rsp' in params) && ('rsip' in params) && ('lp' in params);
}

if (!ok) {
  console.log("4D proxy server\n\nEste programa sirve para dos cosas:\n- Una es mostrar el orden en que se producen las solicitudes y las respuestas entre un cliente y un servidor 4D conectados por tcp/ip.\n- La otra es introducir una latencia (expresada entre milisegundos) a cada paquete que se envía y a cada paquete que se recibe.\n\nNecesita 4 parámetros para funcionar:\nlat:ms     -> los milisegundos de latencia que hay que añadir\nrsip:ip    -> la IP del servidor remoto.\nrsp:puerto -> el puerto del servidor remoto.\nlp:puerto  -> el puerto local (de este ordenador) en el que estará el proxy.\n\nPor ejemplo, para arrancar este proxy en el puerto 12345 de este ordenador, y hacer que se conecte a un servidor 4D que esté en la IP 10.0.0.1 en el puerto 19813, habrá que teclear:\n\nnode 4dproxy.js lp:12345 rsip:10.0.0.1 rsp:19813\n");
  return;
}

var net= require('net');

var lat= (params.lat= (parseInt(params.lat, 10) || 0));
var rsp= (params.rsp= (parseInt(params.rsp, 10) || 19813));
var rsip= (params.rsip= (params.rsip || '0.0.0.0'));
var lp= (params.lp= (parseInt(params.lp, 10) || 0));
console.log(params);

var offset= rsp- lp;
[lp, lp+1].forEach(function (port) {
  net.createServer(clientConnection).listen(port);
  console.log('Listening on localhost:'+ port+ " <-> "+ rsip+ ":"+ (port+offset));
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
  var serverSocket= net.createConnection(puerto+offset, rsip);
  
  serverSocket.on('connect', function () {
    //Esto sólo se ejecuta si se consigue conectar al 4D Server.
    console.log('  ['+ numero+ '] **** NUEVA CONEXION : ['+ puerto+ ' <-> '+ (puerto+offset)+ ']');
  });
  
  
  serverSocket.on('data', function (data) {
    // Esto se ejecuta cada vez que se recibe un paquete de datos del servidor 4D.
    // Lo que nos llega del server lo metemos en un buffer para enviarlo al cliente.
    clientBuffer.push({data:data, t:Date.now()+lat});
    if (!writer.timer) writer.timer= setTimeout(writer, lat);
    
    var str= data.toString('ascii').replace(/\W/g, ".");
    console.log('i '+ '['+ numero+ '] t:'+ ((Date.now()-time_0)/1000).toFixed(1)+ 's #'+ (ctr++)+ ' L:'+ data.length+ ' data:'+ str);
  });
  
  
  clientSocket.on('data', function (data) {
    // Esto se ejecuta cada vez que se recibe un paquete de datos del cliente 4D.
    // Lo que nos llega del cliente lo metemos en un buffer para enviarlo al server.
    serverBuffer.push({data:data, t:Date.now()+lat});
    if (!writer.timer) writer.timer= setTimeout(writer, lat);
    
    var str= data.toString('ascii').replace(/\W/g, ".");
    console.log('o '+ '['+ numero+ '] t:'+ ((Date.now()-time_0)/1000).toFixed(1)+ 's #'+ (ctr++)+ ' L:'+ data.length+ ' data:'+ str);
  });
  
  clientSocket.on('end', function () {
    //El cliente 4D ha desconectado del proxy. Hemos de desconectar del 4D Server también.
    serverSocket.destroy();
    clientSocket= serverSocket= undefined;
    console.log('  ['+ numero+ '] **** SE HA DESCONECTADO');
  });
  
  
  //writer() envía a sus destinos el contenido de los buffers.
  function writer () {
    var t1= 0, t2= 0, now;
    
    if (serverSocket) {
      while (serverBuffer.length) {
        now= Date.now();
        if (serverBuffer[0].t > now) {
          t2= serverBuffer[0].t- now;
          break;
        }
        serverSocket.write(serverBuffer.shift().data);
      }
    }
    
    if (clientSocket) {
      while (clientBuffer.length) {
        now= Date.now();
        if  (clientBuffer[0].t > now) {
          t1= clientBuffer[0].t- now;
          break;
        }
        clientSocket.write(clientBuffer.shift().data);
      }
    }
    
    writer.timer= (t1 || t2) ? setTimeout(writer, Math.min(t1, t2)) : 0;
  }
}

