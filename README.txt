*******************
* 4D PROXY SERVER *
*******************

2011-06-15 jorge@jorgechamorro.com

Este programa sirve para dos cosas:
- Una es mostrar el orden en que se producen las solicitudes y las respuestas entre un cliente 4D y un servidor 4D conectados por tcp/ip.
- La otra es introducir una latencia (expresada entre milisegundos) a cada paquete que se envía y a cada paquete que se recibe.

Necesita 4 parámetros para funcionar:

lat:ms    -> los milisegundos de latencia que hay que añadir (por defecto 0)
data:len  -> el número de caracteres que se quiere mostrar en data: (por defecto todos)
sip:ip    -> la IP del servidor 4D remoto.
sp:puerto -> el puerto del servidor 4D remoto (por defecto 19813).
pp:puerto del proxy -> el puerto al que hay que conectarse para acceder a través del proxy.

Por ejemplo, para arrancar este proxy en el puerto 12345 de este ordenador, y hacer que se conecte a un servidor 4D que esté en la IP 10.0.0.1 en el puerto 19813, añadiendo una latencia de 50 ms habrá que teclear:

node 4dproxy.js pp:12345 sip:10.0.0.1 sp:19813 lat:50

El orden de los parámetros no importa.
Si no se especifica lat: se supone que es 0.
Si no se especifica sp: se supone que es 19813
Si no se especifica data: (o si es cero) se muestran todos los datos de cada paquete
