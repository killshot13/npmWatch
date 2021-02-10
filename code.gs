const cc = DataStudioApp.createCommunityConnector();

function getAuthType() {
  let AuthTypes = cc.AuthType;
  return cc.newAuthTypeResponse().setAuthType(AuthTypes.NONE).build();
}

function getConfig(req) {
  let config = cc.getConfig();

  config
    .newInfo()
    .setId("instructions")
    .setText("Enter npm package names to fetch their download count.");

  config
    .newTextInput()
    .setId("package")
    .setName("Enter a single package name")
    .setHelpText("e.g. googleapis or lighthouse")
    .setPlaceholder("googleapis");

  config.setDateRangeRequired(true);

  return config.build();
}

function getFields(request) {
  let cc = DataStudioApp.createCommunityConnector();
  let fields = cc.getFields();
  let types = cc.FieldType;
  let aggregations = cc.AggregationType;

  fields.newDimension().setId("packageName").setType(types.TEXT);

  fields
    .newMetric()
    .setId("downloads")
    .setType(types.NUMBER)
    .setAggregation(aggregations.SUM);

  fields.newDimension().setId("day").setType(types.YEAR_MONTH_DAY);

  return fields;
}

function getSchema(request) {
  let fields = getFields(request).build();
  return { schema: fields };
}

function responseToRows(requestedFields, response, packageName) {
  // Transform parsed data and filter for requested fields
  return response.map(function (dailyDownload) {
    let row = [];
    requestedFields.asArray().forEach(function (field) {
      switch (field.getId()) {
        case "day":
          return row.push(dailyDownload.day.replace(/-/g, ""));
        case "downloads":
          return row.push(dailyDownload.downloads);
        case "packageName":
          return row.push(packageName);
        default:
          return row.push("");
      }
    });
    return { values: row };
  });
}

function getData(request) {
  let requestedFieldIds = request.fields.map(function (field) {
    return field.name;
  });
  let requestedFields = getFields().forIds(requestedFieldIds);

  // Fetch and parse data from API
  let url = [
    "https://api.npmjs.org/downloads/range/",
    request.dateRange.startDate,
    ":",
    request.dateRange.endDate,
    "/",
    request.configParams.package,
  ];
  let response = UrlFetchApp.fetch(url.join(""));
  let parsedResponse = JSON.parse(response).downloads;
  let rows = responseToRows(
    requestedFields,
    parsedResponse,
    request.configParams.package
  );

  return {
    schema: requestedFields.build(),
    rows: rows,
  };
}
