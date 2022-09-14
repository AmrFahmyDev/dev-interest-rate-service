const express = require('express');
const bodyParser = require('body-parser');
const redis = require('ioredis');
const request = require('request');
const { Kafka } = require('kafkajs');
const redisConfig = require('./db/redisConfig.js').redisConfig;
const socketStore = new redis(redisConfig.port, redisConfig.host, redisConfig.redisOptions);

// const AWS = require("aws-sdk");
// AWS.config.update({ region: 'eu-west-1' });

// const dynamodb = new AWS.DynamoDB.DocumentClient();
// const TableName = 'currencies';


const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const dbConnection = require('./db/dbConnection');
dbConnection.connect(); //.then(startApp)



const kafka = new Kafka({
  brokers: ['bank-services-cluster-kafka-bootstrap.bank-services.svc:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});
const producer = kafka.producer()
const consumer = kafka.consumer({ groupId: 'group1' })

const run = async (mailAddress) => {
  // Producing
  await producer.connect()
  await producer.send({
    topic: 'send-email',
    messages: [
      { value: mailAddress },
    ],
  });

  // Consuming
  await consumer.connect()
  await consumer.subscribe({ topic: 'send-email', fromBeginning: true })

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        partition,
        offset: message.offset,
        value: message.value.toString(),
      })
    },
  })
}

app.get('/', (req, res) => {
  console.log('GET Request');
  // console.log('req.query:', req.query);
  // var currency = req.query.currency;
  // if (!currency) {
  //   return res.send('Please query about vaild Currency!');
  // }

  return getInterestRate(res);
});

app.post('/', (req, res) => {
  console.log('req.body:', req.body);
  let mailAddress = req.body.mailAddress;

  if (!mailAddress) {
    return res.send('Please query about vaild Email Address!');
  }

  var options = {
    url: process.env.MAIL_SERVICE,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'mailAddress=' + mailAddress
  }
  console.log('options:', options);
  run(mailAddress).catch(console.error);
  return getInterestRate(res);

  // request(options, function (err, response, body) {
  //   console.log('mail service err:', err);
  //   console.log('mail service body:', body);
  //   return getExchangeRate(res, currency);
  // });
});

app.get('/health', (req, res) => {
  res.status(200);
  res.send('healthy');
});

app.listen(8080, () => {
  console.log('App listening on port 8080!');
});

function getInterestRate(res) {
  console.log('>>>>>>getInterestRate');
  let interestRateKey = 'interestRate_key';

  socketStore.get(interestRateKey, function (getKeyErr, interestRateKeyCached) {
    if (getKeyErr) {
      console.log('serverCached|getKeyErr:', getKeyErr);
    } else if (!getKeyErr && interestRateKeyCached && interestRateKeyCached !== null) {
      console.log('interestRateKeyCached:', interestRateKeyCached);

      return res.send("Redis_Interest Rate is: " + interestRateKeyCached);
    } else {
      getCurrentRate(res);
    }
  });
}

async function getCurrentRate(res) {
  console.log('>>>>>>getCurrentRate');

  const interestRateCollection = dbConnection.getinterestRateCollection();
  let result = await interestRateCollection.findOne({});

  console.log('result:', result);
  console.log('result.Rate:', result.Rate);
  res.send("MongoDB_Interest Rate is: " + result.Rate);

  let interestRateKey = 'interestRate_key';

  socketStore.set(interestRateKey, result.Rate, function (setKeyErr, setKeyResult) {
    socketStore.expire(interestRateKey, (60 * 60), function (setExpireErr, setExpireResult) {
      return false;
    });
  });
}