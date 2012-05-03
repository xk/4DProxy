#!/usr/bin/env node

// 2011-06-15 4DProxy.js  investigando la lentitud

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
  console.log("4D proxy server\n\nEste programa sirve para dos cosas:\n- Una es mostrar el orden en que se producen las solicitudes y las respuestas entre un cliente y un servidor 4D conectados por tcp/ip.\n- La otra es introducir una latencia (expresada entre milisegundos) a cada paquete que se envía y a cada paquete que se recibe.\n\nNecesita 3 parámetros para funcionar:\nrsip:ip    -> la IP del servidor remoto.\nrsp:puerto -> el puerto del servidor remoto.\nlp:puerto  -> el puerto local (de este ordenador) en el que estará el proxy.\n\nPor ejemplo, para arrancar este proxy en el puerto 12345 de este ordenador, y hacer que se conecte a un servidor 4D que esté en la IP 10.0.0.1 en el puerto 19813, habrá que teclear:\n\nnode 4dproxy.js lp:12345 rsip:10.0.0.1 rsp:19813\n");
  return;
}

var net= require('net');

var lat= (params.lat= (Number(params.lat) || 0));
var rsp= (params.rsp= (Number(params.rsp) || 19813));
var rsip= (params.rsip= (params.rsip || '0.0.0.0'));
var lp= (params.lp= (Number(params.lp) || 0));
console.log(params);


var proxy1= net.createServer(clientConnection);
proxy1.listen(lp);
console.log('4D proxy server escuchando en localhost:'+ lp);

var proxy2= net.createServer(clientConnection2);
proxy2.listen(lp+1);
console.log('4D proxy server escuchando en localhost:'+ (lp+1));

function clientConnection (clientSocket) {
  
  //Cada vez que conecte al proxy un cliente 4D, se ejecuta esta función.
  
  console.log('\nUn cliente 4D ha conectado: '+ clientSocket.address());
  
  var clientBuffer= [];
  var serverBuffer= [];
  var totalPacketsCtr= 0;
  var clientPacketsCtr= 0;
  var serverPacketsCtr= 0;
  var clientTotalBytesCtr= 0;
  var serverTotalBytesCtr= 0;
  
  //Abrimos una nueva conexión al 4D Server. Lo que llegue del cliente 4D se mandará al 4D Server, y viceversa.
  var serverSocket= net.createConnection(rsp, rsip);
  
  serverSocket.on('connect', function () {
    //Esto sólo se ejecuta si se consigue conectar al 4D Server.
    console.log('\nAbierta una nueva conexión al servidor 4D '+ rsip+ ':'+ rsp);
  });
  
  
  serverSocket.on('data', function (data) {
    // Esto se ejecuta cada vez que se recibe un paquete de datos del servidor 4D.
    totalPacketsCtr++;
    serverPacketsCtr++;
    serverTotalBytesCtr+= data.length;
    //process.stdout.write('\nS -> '+ [totalPacketsCtr, serverPacketsCtr, serverTotalBytesCtr]);
    process.stdout.write('S');
    
    //Lo que nos llega del server lo metemos en un buffer para enviarlo al cliente.
    clientBuffer.push(data);
    
    //Si hay latencia, se irá enviando a medida que el timer de latencia vaya llamando a writer().
    //Pero si no hay latencia lo mandamos YA.
    if (!lat) writer();
  });
  
  
  clientSocket.on('data', function (data) {
    // Esto se ejecuta cada vez que se recibe un paquete de datos del cliente 4D.
    totalPacketsCtr++;
    clientPacketsCtr++;
    clientTotalBytesCtr+= data.length;
    //process.stdout.write('\nC -> '+ [totalPacketsCtr,clientPacketsCtr, clientTotalBytesCtr]);
    process.stdout.write('C');
    //Lo que nos llega del cliente lo metemos en un buffer para enviarlo al server.
    serverBuffer.push(data);
    
    //Si hay latencia, se irá enviando a medida que el timer de latencia vaya llamando a writer().
    //Pero si no hay latencia lo mandamos YA.
    if (!lat) writer();
  });
  
  clientSocket.on('end', function () {
    //El cliente 4D ha desconectado del proxy. Hemos de desconectar del 4D Server también.
    serverSocket.destroy();
    clientSocket= serverSocket= undefined;
    console.log('\nSe ha desconectado un cliente 4D del proxy -> Se ha desconectado el proxy del servidor 4D');
  });
  
  
  function writer () {
    
    //writer() envía a sus destinos el contenido de los buffers.
    
    if (lat) {
      //Si latencia != 0 entonces es un timer el que llama a writer() cada latencia milisegundos.
      if (clientSocket || serverSocket) setTimeout(writer, lat);
    }
    
    if (clientSocket) {
      while (clientBuffer.length) clientSocket.write(clientBuffer.shift());
    }
    if (serverSocket) {
      while (serverBuffer.length) serverSocket.write(serverBuffer.shift());
    }
  }
  
  if (lat) writer();
}


function clientConnection2 (clientSocket) {
  
  //Cada vez que conecte al proxy un cliente 4D, se ejecuta esta función.
  
  console.log('\nUn cliente 4D ha conectado: '+ clientSocket.address());
  
  var clientBuffer= [];
  var serverBuffer= [];
  var totalPacketsCtr= 0;
  var clientPacketsCtr= 0;
  var serverPacketsCtr= 0;
  var clientTotalBytesCtr= 0;
  var serverTotalBytesCtr= 0;
  
  //Abrimos una nueva conexión al 4D Server. Lo que llegue del cliente 4D se mandará al 4D Server, y viceversa.
  var serverSocket= net.createConnection((rsp+1), rsip);
  
  serverSocket.on('connect', function () {
    //Esto sólo se ejecuta si se consigue conectar al 4D Server.
    console.log('\nAbierta una nueva conexión al servidor 4D '+ rsip+ ':'+ (rsp+1));
  });
  
  
  serverSocket.on('data', function (data) {
    // Esto se ejecuta cada vez que se recibe un paquete de datos del servidor 4D.
    totalPacketsCtr++;
    serverPacketsCtr++;
    serverTotalBytesCtr+= data.length;
    //process.stdout.write('\nS -> '+ [totalPacketsCtr, serverPacketsCtr, serverTotalBytesCtr]);
    process.stdout.write('S');
    
    //Lo que nos llega del server lo metemos en un buffer para enviarlo al cliente.
    clientBuffer.push(data);
    
    //Si hay latencia, se irá enviando a medida que el timer de latencia vaya llamando a writer().
    //Pero si no hay latencia lo mandamos YA.
    if (!lat) writer();
  });
  
  
  clientSocket.on('data', function (data) {
    // Esto se ejecuta cada vez que se recibe un paquete de datos del cliente 4D.
    totalPacketsCtr++;
    clientPacketsCtr++;
    clientTotalBytesCtr+= data.length;
    //process.stdout.write('\nC -> '+ [totalPacketsCtr,clientPacketsCtr, clientTotalBytesCtr]);
    process.stdout.write('C');
    //Lo que nos llega del cliente lo metemos en un buffer para enviarlo al server.
    serverBuffer.push(data);
    
    //Si hay latencia, se irá enviando a medida que el timer de latencia vaya llamando a writer().
    //Pero si no hay latencia lo mandamos YA.
    if (!lat) writer();
  });
  
  clientSocket.on('end', function () {
    //El cliente 4D ha desconectado del proxy. Hemos de desconectar del 4D Server también.
    serverSocket.destroy();
    clientSocket= serverSocket= undefined;
    console.log('\nSe ha desconectado un cliente 4D del proxy -> Se ha desconectado el proxy del servidor 4D');
  });
  
  
  function writer () {
    
    //writer() envía a sus destinos el contenido de los buffers.
    
    if (lat) {
      //Si latencia != 0 entonces es un timer el que llama a writer() cada latencia milisegundos.
      if (clientSocket || serverSocket) setTimeout(writer, lat);
    }
    
    if (clientSocket) {
      while (clientBuffer.length) clientSocket.write(clientBuffer.shift());
    }
    if (serverSocket) {
      while (serverBuffer.length) serverSocket.write(serverBuffer.shift());
    }
  }
  
  if (lat) writer();
}
