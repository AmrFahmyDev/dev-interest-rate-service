const initJaegerTracer = require("jaeger-client").initTracer;
const config = {
    serviceName: "currency-exchange-service",
    sampler: {
        type: "const",
        param: 1,
    },
    reporter: {
        collectorEndpoint: 'http://jaeger-collector.istio-system.svc:14268/api/traces',
        logSpans: true
    },
};
const options = {};
const tracer = initJaegerTracer(config, options);

module.exports = tracer;
// {
//     connect,
//     getCurrencyCollection
// }
