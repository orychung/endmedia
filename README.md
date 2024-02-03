# endmedia
Home Media Library based on endfw

## To Directly Deploy

1. ensure node.js / npm is installed and available in %PATH%
1. charge-out endmedia
1. copy `.\setup\sampleConfig\*` to `.\`
    1. plug the ssl certs (may use `.\setup\ssl` to help)
    2. update `\.local\endmedia\service.json` to apply settings
1. go to `.\nodejs` folder
1. ```cmd
    npm i
    ```
1. ```cmd
    endmedia.cmd
    ```
    * to run as another user, try `cmdstart_node.cmd`
