var mongoose = require('mongoose'); //mongoose 라이브러리에서 사용을 선언한다. node.js MongoDB를 쉽게 이어주는 네이티브 드라이버이다.
mongoose.connect('mongodb://localhost/createDB');//로컬 호스트 주소의 createDB DB를 만든다.

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));//DB를 연결 하는데 실패하면 connection error를 표시한다.

//http,html
var express = require('express');//express 라이브러리에서 사용을 선언한다.
var ejs = require('ejs');//ejs 라이브러리에서 사용을 선언한다. html 에서 손쉽게 sricpt 작업을 할 수 있다.
var router = express.Router; // 최신버전부터 라우터를 이런방식으로 선언한다.
var http = require('http');//http 라이브러리에서 사용을 선언한다.
var path = require('path');//path 라이브러리에서 사용을 선언한다.
var app = express();
var fs = require('fs');//fs 라이브러리에서 사용을 선언한다. html을 파일을 불러와서 표시하는데 사용한다.
var url = require('url');//url 라이브러리에서 사용을 선언한다.

//DB 값 저장 start
var degree = 15; //remove 
var humidity = 20; //remove

var userSchema1 = mongoose.Schema({ //DB에 저장할 틀을 만들어주어서 아래와 방식대로 저장한다. 
	time: 'date',
	degree_num: 'number' //온도 
});
var userSchema2 = mongoose.Schema({
	time: 'date',
	humidity_num: 'number'// 습도 
});
var userSchema3 = mongoose.Schema({
	time: 'number',
	opt_degree_num: 'number'// 최적온도 
});
var Degree = mongoose.model('degree', userSchema1);
var Humidity = mongoose.model('humidity', userSchema2);
var Opt_degree = mongoose.model('opt_degree', userSchema3);

db.once('open', function callback () { // 서버가 실행하여서 DB를 한번 열때 동작한다.
	console.log("DB_Start");
	D_H_insert(degree,humidity);// 시작하마자 DB에 한번 저장하도록한다.
});

setInterval(function(){ //서버가 구동하고 있다면 몇초마다 동작하는 함수이다.
	var DB_time = new Date(); //DB_time 최적온도 DB에 사용할 전역변수 날짜 
	console.log(DB_time);
	D_H_insert(degree,humidity); // DB에 온습도 저장함수
	if( DB_time.getHours() == 23 ) // 23시가 되었을때 최적화 작업을 시작한다. 
		opt_degree_result();
},600000);// 10분으로 주었다.


http.createServer(app).listen(52273, function () { //포트번호 52273
	console.log('Server running at http://127.0.0.1:52273'); // 로컬 호스트로 서버를 동작 시킨다.
});
//DB 값 저장 end

app.set('views',path.join(__dirname,'/views'));// /views 폴더에 있는 경로를 지정한 뒤 
app.set('view engine','html'); // 폴더에 있는 html 파일들을 
app.engine('html',ejs.renderFile); // ejs 파일로 렌더링 한다.

//html 웹 어플레이케이션 start
app.get('/', function(req,res,err){
	console.log('access') //test용 good값
    fs.readFile('./views/Main.html', 'utf8', function( err, data){
    	//파일을 utf8방식으로 읽어들인다.
 	 res.writeHead( 200, {'Content-Type':'text/html'}); //html방식으로 페이지에 출력
  	 res.write( ejs.render(data, {}));//값을 data값으로 넘겨준다.
 });
});
app.get('/degree', function(req,res,err){ //온도 테이블 라우터로 웹페이지 상에 접속이 가능하다.

    fs.readFile('./views/D_list.html', 'utf8', function( err, data){
    	//파일을 utf8방식으로 읽어들인다.

	Degree.find( {}, function(error, results) { //온도 DB값을 전부 호출한 후 results부분에 넣다
    	res.send(ejs.render(data, { // 그값을 data로 한번에 보내준다.
        data : results
      }));
    });
 });
});
app.get('/humidity', function(req,res,err){//습도 테이블 
    fs.readFile('./views/H_list.html', 'utf8', function( err, data){
    	//파일을 utf8방식으로 읽어들인다.
 	 Humidity.find( {}, function(error, results) {
    	res.send(ejs.render(data, {
        data : results
      }));
    });
 });
});
app.get('/opt', function(req,res,err){ //최적온도 테이블 
    fs.readFile('./views/OPT_list.html', 'utf8', function( err, data){
    	//파일을 utf8방식으로 읽어들인다.
 	 Opt_degree.find( {}, function(error, results) {
    	res.send(ejs.render(data, {
        data : results
      }));
    });
 });
});
app.get('/clear',function(req,res){
	var uri = url.parse(req.url,true).query;//url에 있는 정보를 가져와서 uri에 넣어준다
	if(uri.cmd == "del"){ //cmd 값이 del이라면 된다. 예시 주소 url?cmd=del
		DB_drop(Degree,Humidity);
		console.log('DB_Clear success') //test용 good값
	}
	res.redirect('/');// 실행완료후 '/' 곳으로 돌아간다.
});
app.get('/insert',function(req,res){
	var uri = url.parse(req.url,true).query;//url에 있는 정보를 가져와서 uri에 넣어준다
	if(uri.cmd == "in"){ //cmd 값이 in 이라면 된다. 
		console.log('insert on') 
		degree = uri.degree; //또한 cmd=in&degree=온도값&humidity=습도값 으로 url을 작성한다.
		humidity = uri.humidity;
	}
});

//html 웹 어플레이케이션 end

var D_H_insert = function(degree,humidity){
	//time
	var now = new Date(); // 날짜 객체를 생성한다. Date 는 년도 월 일 시 분 초 로 나뉘어져있다.
	var degree1 = new Degree({ time: now, degree_num: degree }); //스키마로 만든 틀에 now degree 변수 값을 넣는다.
	var humidity1 = new Humidity({ time: now, humidity_num: humidity }); //스키마로 만든 틀에 now humidity 변수 값을 넣는다.

	degree1.save(function ( err, user1) { // DB 저장부분 
		if (err)
			console.log("error");
	});
	humidity1.save(function ( err, user1) {
		if (err)
			console.log("error");
	});
};
var DB_drop = function(Degree,Humidity){
	for(var i = -50; i <= 150; i++){ //-50 ~ 150 까지 온도의 한계 이기 때문에 제거를 한다.
	db.collection('degrees').remove({degree_num : i});
	db.collection('humidities').remove({humidity_num : i});
	}
};
var opt_insert = function(opt_degree1,time){
	var opt_degree1 = new Opt_degree({ time: time, opt_degree_num: opt_degree1 });
	opt_degree1.save(function ( err, user1) {
		if (err)
			console.log("error");
	});
};
var opt_degree_result = function(){
	var DB_count = 0;
	var DB_degree = new Array();
	var opt_degree_final = 0;
	var DB_degree_count = 0;// 온도 값 갯수 
	var DB_degree_total = 0;//온도 값 총합 
	var DB_data_H = 0; //DB 시간 구분
	var temp = 0;
	var now = new Date(); //Date 함수 호출하여 now 대입
	for(var i = -50; i <= 150; i++){ //-50 ~ 150 까지 온도의 한계 이기 때문에 제거를 한다.
		db.collection('opt_degrees').remove({opt_degree_num : i});
	}
	
	Degree.find( {}, function(error, results) {
		for(var hour = 0 ; hour <= 24 ; hour++){ // 24시간 을 전부 확인하기 위하여 0 ~24로 하였다.
		results.forEach(function (item, index) { // forEach로 값을 읽어들어서 hour값에 시간대에 따라서 DB값을 전부 확인한다.
			temp = item.degree_num; // DB에서 찾은 온도값을 temp에 넣는다.
			if( hour == item.time.getHours()){ // 반복되고 있는 시간과 DB에 있는 시간이 일치할 경우에
				DB_degree_total += temp; // temp에 저장된 변수를 총합 값에 계속해서 더해준다.
				DB_degree_count++; //그후 DB_degree_total 개수를 카운팅한다.
			}
		});
		if(DB_degree_count > 0){
			opt_degree_final = DB_degree_total/DB_degree_count;	 //구해진 DB_degree_total 부분을 개수에 따라 나뉘어준다.
			DB_degree_count = 0; //초기화 
			DB_degree_total = 0;
			opt_degree_final=Math.round(opt_degree_final); //소수점이하 자리는 버린다.
			console.log(hour + ':' + opt_degree_final); // 시간과 최적온도 콘솔창에 표시 
			opt_insert(opt_degree_final,hour); //DB 값을 넣어준다.
		}; 
	};
  });
};