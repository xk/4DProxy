var net= require('net');

var latencia= Number(process.argv[2]) || 0;
console.log('latencia: '+ latencia+ ' milisegundos');

var k4DServerPort= 19813;
var k4DServerIP= '10.148.15.100';

var proxy= net.createServer(clientConnection);
proxy.listen(k4DServerPort);
console.log('4D proxy server escuchando en localhost:'+ k4DServerPort);

function clientConnection (clientSocket) {
  
  //Cada vez que conecte al proxy un cliente 4D, se ejecuta esta función.
  
  console.log('Un cliente 4D ha conectado al proxy');
  console.log(clientSocket.address());
  
  var clientBuffer= [];
  var serverBuffer= [];
  var totalPacketsCtr= 0;
  var clientPacketsCtr= 0;
  var serverPacketsCtr= 0;
  var clientTotalBytesCtr= 0;
  var serverTotalBytesCtr= 0;
  
  //Abrimos una nueva conexión al 4D Server. Lo que llegue del cliente 4D se mandará al 4D Server, y viceversa.
  var serverSocket= net.createConnection(k4DServerPort, k4DServerIP);
  
  serverSocket.on('connect', function () {
    //Esto sólo se ejecuta si se consigue conectar al 4D Server.
    console.log('Abierta una nueva conexión al servidor 4D '+ k4DServerIP+ ':'+ k4DServerPort);
  });
  
  
  serverSocket.on('data', function (data) {
    // Esto se ejecuta cada vez que se recibe un paquete de datos del servidor 4D.
    totalPacketsCtr++;
    serverPacketsCtr++;
    serverTotalBytesCtr+= data.length;
    process.stdout.write('S');
    
    //Lo que nos llega del server lo metemos en un buffer para enviarlo al cliente.
    clientBuffer.push(data);
    
    //Si hay latencia, se irá enviando a medida que el timer de latencia vaya llamando a writer().
    //Pero si no hay latencia lo mandamos YA.
    if (!latencia) writer();
  });
  
  
  clientSocket.on('data', function (data) {
    // Esto se ejecuta cada vez que se recibe un paquete de datos del cliente 4D.
    totalPacketsCtr++;
    clientPacketsCtr++;
    clientTotalBytesCtr+= data.length;
    process.stdout.write('C');
    //Lo que nos llega del cliente lo metemos en un buffer para enviarlo al server.
    serverBuffer.push(data);
    
    //Si hay latencia, se irá enviando a medida que el timer de latencia vaya llamando a writer().
    //Pero si no hay latencia lo mandamos YA.
    if (!latencia) writer();
  });
  
  clientSocket.on('end', function () {
    //El cliente 4D ha desconectado del proxy. Hemos de desconectar del 4D Server también.
    serverSocket.destroy();
    clientSocket= serverSocket= undefined;
    console.log('\nSe ha desconectado un cliente 4D del proxy\nSe ha desconectado del servidor 4D');
  });
  
  
  function writer () {
    
    //writer() envía a sus destinos el contenido de los buffers.
    
    if (latencia) {
      //Si latencia != 0 entonces es un timer el que llama a writer() cada latencia milisegundos.
      if (clientSocket || serverSocket) setTimeout(writer, latencia);
    }
    
    if (clientSocket) {
      while (clientBuffer.length) clientSocket.write(clientBuffer.shift());
    }
    if (serverSocket) {
      while (serverBuffer.length) serverSocket.write(serverBuffer.shift());
    }
  }
  
  if (latencia) writer();
}

