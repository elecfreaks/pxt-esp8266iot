# ESP8266_IoT package

ESP8266_IoT package is developed under the cooperation of [ELECFREAKS](https://www.elecfreaks.com/), [CLSAAROOM](http://www.classroom.com.hk/) and [TINKERCADEMY](https://tinkercademy.com/).

This package uploads data to THINGSPEAK IOT through ESP8266 module. For more details about ESP8266 module, you can visit: http://www.elecfreaks.com/estore/esp8266-serial-wifi-module.html

Before start, you have to register an account of [thinkspeak](https://thingspeak.com/).

## Hardware Setup

1. Insert the OLED display into the I2C ports on the break out board.

## Basic usage

1. Open [Microsoft PXT/microbit](https://pxt.microbit.org) and new a project
2. Search and add the `ESP8266` package
3. Use the `ESP8266` drawer in the editor to drag out and arrange the blocks
4. Click `Download` to move your program to the micro:bit

## Example

### setwifi
Set pin RX and pin TX for ESP8266 Serial Wifi Module，Baud rate: 9600.
```blocks
ESP8266_IoT.initwifi(SerialPin.P2, SerialPin.P8)
```

### connet wifi
Connectwifi，please fill in your ssid and your key.
```blocks
ESP8266_IoT.connectwifi("your ssid", "your key")
```

### connectthingspeak
Connect thingspeak IoT TCP server.
```blocks
ESP8266_IoT.connectthingspeak()
```

### set data to be send 
Set data to be sent. Firstly, you should fill in your write api key.
```blocks
ESP8266_IoT.tosendtext(
"your write api key",
0,
0,
0,
0,
0,
0,
0,
0
)
``` 

### senddata
Send data to thingspeak.
```blocks
ESP8266_IoT.senddata()
```

## License

MIT

## Supported targets

* for PXT/microbit
(The metadata above is needed for package search.)

```package
esp8266=github:elecfreaks/pxt-esp8266iot
```



