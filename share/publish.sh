rm share.zip
zip share.zip share.js mask01-01.png mask01-02.png mask01-03.png mask02-01.png mask02-02.png Avenir-Book.ttf AvenirLTStd-Light.ttf SourceHanSans.otf -r node_modules/

aws lambda update-function-code --region ap-northeast-1 --function-name test --zip-file fileb://share.zip

aws lambda invoke --invocation-type RequestResponse --function-name test --region ap-northeast-1 --log-type Tail --payload file://test.txt outputfile.txt


#aws lambda create-function --region ap-northeast-1 --function-name test --zip-file fileb://index.zip --role arn:aws:iam::459536672544:role/Deepblu_Lambda_Role --handler index.handler --runtime nodejs4.3
