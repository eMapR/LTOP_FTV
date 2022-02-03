
var table = ee.FeatureCollection("users/emaprlab/LTOP_Oregon_Kmeans_Cluster_ID_reps")
var ltgee = require('users/clarype/emapr:Development/LandTrendr_V2.5D.js');

function main () {
  
  // Define the start and the start and end year of the image time series
  var start_year = 1999;
  var end_year = 2020;
  var startDay = '06-20'; 
  var endDay = '09-10'; 
  var maskThese = ['cloud','shadow', 'snow']
  
  // Define a feature Collection of the points that need to be extracted
  var points = ee.FeatureCollection(table).sort('cluster_id');
  
  print(points.first())
  print(points.size())
  
  // Load in the Image Collection
  var annualSRcollection = ltgee.buildSRcollection(start_year, end_year, startDay, endDay, points,maskThese)
  
  // var images = ee.ImageCollection("users/JohnBKilbride/test_medoids")
    //.filterDate(ee.Date.fromYMD(start_year, 1, 1), ee.Date.fromYMD(end_year, 12, 31));
  Map.addLayer(annualSRcollection, {min:0, max:[1500,5500,1500], bands:['B7','B4','B3']}, 'image');
  Map.centerObject(table.geometry(), 11);

  
  // Compute the spectral indicies to be extracted
  var images = annualSRcollection.map(compute_indices);

  // Run the extraction
  var extraction_results = run_extraction(images, points, start_year, end_year);
  print(extraction_results.size())
  
  // Map.addLayer(extraction_results)
  // Select out the relevant fields
  var outputs = extraction_results.select(['cluster_id', 'year', 'NBR', 'TCW', 'TCG', 'NDVI', 'B5'], null, false)//.sort('cluster_id');
  print(outputs.size())
  
  // Export the points
  Export.table.toDrive({
    collection: outputs, 
    description: "LTOP_Oregon_Abstract_Sample_annualSRcollection_Tranformed_NBRTCWTCGNDVIB5_v1", 
    fileNamePrefix: "LTOP_Oregon_Abstract_Sample_annualSRcollection_Tranformed_NBRTCWTCGNDVIB5_v1", 
    fileFormat: 'csv'
  });
  
  return null;
  
}

// Compute the spectral indices
function compute_indices (img) {
  
  // Calculate Tasseled Cap Brightness, Greenness, Wetness
  var bands = img.select(['B1','B2','B3','B4','B5','B7']);
  var coefficients = ee.Array([ 
    [0.2043, 0.4158, 0.5524, 0.5741, 0.3124, 0.2303],
    [-0.1603, -0.2819, -0.4934, 0.7940, -0.0002, -0.1446],
    [0.0315, 0.2021, 0.3102, 0.1594, -0.6806, -0.6109],
    ]);
  var components = ee.Image(coefficients)
    .matrixMultiply(bands.toArray().toArray(1))
    .arrayProject([0])
    .arrayFlatten([['TCB','TCG','TCW']])
    //.multiply(-1)
    .toFloat();
  img = img.addBands(components);
  
  // Compute NDVI and NBR
  img = img.addBands(img.normalizedDifference(['B4','B3']).toFloat().rename(['NDVI']).multiply(1000));
  img = img.addBands(img.normalizedDifference(['B4','B7']).toFloat().rename(['NBR']).multiply(1000));

  return img.select(['NBR', 'TCW', 'TCG', 'NDVI', 'B5']).toFloat();
  
}

// Run the extraction
function run_extraction (images, points, start_year, end_year) {
  
  // Function that is applied to each year
  function inner_map (year) {
    
    // Cast the input
    year = ee.Number(year).toInt16();
    
    // Construct the dates to filter the image collection
    var start_date = ee.Date.fromYMD(year, 1, 1);
    var end_date = ee.Date.fromYMD(year, 12, 31);
    
    // Get the image to be sample
    var current_image = ee.Image(images.filterDate(start_date, end_date).first())
      .addBands(ee.Image.constant(year).rename('year'))
      .unmask(-32768)
      .toInt16();
    
    // Run an extraction
    var extraction = current_image.reduceRegions({
      collection: points, 
      reducer: ee.Reducer.first(), 
      scale: 30,
    });
    
    return extraction.toList(points.size()); // Peter 
    
  }
  
  // Create a list of years to map over
  var years = ee.List.sequence(start_year, end_year);
  
  // Flatten the outputs
  var outputs = ee.FeatureCollection(ee.List(years.map(inner_map)).flatten());
  
  return outputs;
  
}


main();

