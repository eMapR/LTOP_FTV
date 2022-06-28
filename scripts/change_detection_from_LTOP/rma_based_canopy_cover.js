// #####################################################################################################
// ########################    Take LT optimization outputs and make pct tree cover maps ###############
// #####################################################################################################

//first get some user inputs and imports

// var num_pts = 2000; 
//note that the label is just dictated by the reducer below, this could be changed 
var label = 'first'; 
//from the imported images
var bands = ['ndvi','nbr']; 
var yr_band = 'yr_2000'
var startYear = 1990; 
var endYear = 2021; 
var canopy_band = 'treecover2000'
var map_palette = {min: 0, max: 100, palette: ['ffffff', '004000']};
//note that this did not export the whole area 
var lt_like_outputs = ee.Image('users/ak_glaciers/NBR_fit_LandTrendr_like_output_flipped_Cambodia_servir_comps')
Map.addLayer(lt_like_outputs,{},'lt outputs')

/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////Get inputs//////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////

var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA','Cambodia')).geometry();//.buffer(5000);

//Deprecated?
//get the train data into a usable format because its weirdly formatted
// var forest_cover = ee.ImageCollection("NASA/MEASURES/GFCC/TC/v3").filterBounds(aoi)
//                                                                 .filter(ee.Filter.eq('year',2015))
//                                                                 .max()
//                                                                 .select('tree_canopy_cover')

// forest_cover = forest_cover.select('tree_canopy_cover').mosaic(); 

//try using Hansen to see what difference that makes
var forest_cover = ee.Image("UMD/hansen/global_forest_change_2020_v1_8").select('treecover2000'); 
Map.addLayer(forest_cover,map_palette,'forest cover')
// Define a boxcar or low-pass kernel.
// var boxcar = ee.Kernel.square({
//   radius: 7, units: 'pixels', normalize: true
// });
// forest_cover = forest_cover.convolve(boxcar).toInt(); 

//LTOP fitted outputs
// var ndvi = ee.Image('users/ak_glaciers/NDVI_fitted_image_stack_from_LTOP_1990_start'); 
var nbr = ee.Image('users/ak_glaciers/NBR_fitted_image_stack_from_LTOP_1990_start');  
Map.addLayer(nbr.select('yr_2000'),{},'nbr')
//when we apply the model to the timeseries it expects the same band names as the training data so change these to be generic
var band_names = nbr.bandNames(); 
// var ndvi_train = ndvi.select([yr_band],['ndvi']);
var nbr_train = nbr.select([yr_band],['nbr']);

//this will be the image that we use to get spectral values for the random forest below 
var sample_img = nbr_train//.addBands(ndvi_train); 

//visualize the inputs
var img_palette = {min:-500, max:5000, palette:['000000','ffffff']}; 
Map.addLayer(nbr.select('yr_2000'),img_palette,'input image'); 

/////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////Create the training data and train a model/////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
//create some random points 
// var train_pts = ee.FeatureCollection.randomPoints({
//   region: aoi, 
//   points:num_pts, 
//   seed: 10
// }); 

//instead of creating random points try creating stratified random points
// var train_pts
// var thresholds = ee.Image([20, 40, 60, 80, 100]);
// var zones = forest_cover.lt(thresholds).reduce('sum');
// Map.addLayer(zones, {min: 0, max: 100}, 'zones');
var forest_cover_reclass = forest_cover.divide(20).ceil().toInt();
// Map.addLayer(forest_cover_reclass,{},'forest cover reclass')

var train_pts = forest_cover_reclass.stratifiedSample({
  numPoints:400, 
  classBand:canopy_band, 
  scale:30, 
  projection:'EPSG:4326',
  geometries:true, 
  region:aoi
  
}); 

print(train_pts)
Map.addLayer(train_pts,{},'train pts')

//i think because there are so many pixels with a value of zero we're still oversampling this. 
//i guess we should just force that number down? We can do this with the random column we're creating for the 
//validation/train split 
//allocate some pts to train and some to validation
train_pts = train_pts.randomColumn();
//before we split, supress the 0 points
var zeros = ee.FeatureCollection(train_pts.filter(ee.Filter.eq(canopy_band,0))
                                          .sort('random')
                                          .toList(400)
                                          .slice(0,50)); //hardcoded

train_pts = train_pts.filter(ee.Filter.neq(canopy_band,0))//.and(ee.Filter.neq('tree_canopy_cover',5)))
                    .merge(zeros); 
              
//add prop with the canopy cover from class layer 
train_pts = forest_cover.reduceRegions({
  collection:train_pts, 
  reducer:ee.Reducer.first(), 
  scale:30
}); 

//try removing points with a value of 0 
train_pts = train_pts.filter(ee.Filter.neq('first',0)); 

//split for train/validation
var split = 0.8;  // Roughly 80% training, 20% testing.
train_pts = train_pts.filter(ee.Filter.lt('random', split));
var validation_pts = train_pts.filter(ee.Filter.gte('random', split));

//get the spectral information for the random pts 
var training = sample_img.select('nbr').sampleRegions({
  collection: train_pts,
  properties: [label],
  scale: 30, 
  // geometries:true //this only needs to be set to true if you want to export these 
});
Map.addLayer(training,{},'training data')
print(training,'training')
//plot the training data
// Define the chart and print it to the console.
var chart =
    ui.Chart.feature
        .byFeature({
          features: training,
          xProperty: 'first',
          yProperties: 'nbr'
        })
        .setSeriesNames(['NBR'])
        .setChartType('ScatterChart')
        .setOptions({
          title: 'Canopy cover vs NBR values',
          hAxis:
              {title: '% Canopy cover', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'Scaled NBR values',
            titleTextStyle: {italic: false, bold: true}
          },
          pointSize: 5,
          // colors: ['1d6b99', 'cf513e'],
        });
print(chart);

// /////////////////////////////////////////////////////////////////////////////////////////////////////////
// ///////////////////////////////////////////Try the RMA model ////////////////////////////////////////////
// /////////////////////////////////////////////////////////////////////////////////////////////////////////
//from the RMA paper (cohen et al)

//try with just canopy cover and NBR because this is a bivariate relationship 
//define a function that makes the rma canopy cover callable 
//note that calc_img is whatever image you're using to fit the reg equation and fit img is whatever 
//you want to use to apply the coefficients 
var rmaCanopyCover = function(training,x_band,y_band,fit_img){
  
  var Xstd = ee.Number(training.aggregate_stats(x_band).get('total_sd'));
  var Ystd = ee.Number(training.aggregate_stats(y_band).get('total_sd'));
  var Xmean = ee.Number(training.aggregate_stats(x_band).get('mean'));
  var Ymean = ee.Number(training.aggregate_stats(y_band).get('mean'));
  //now calculate b0 and b1 according to the RMA instructions 
  var slope = Ystd.divide(Xstd); 
  var Yint = Ymean.subtract(slope.multiply(Xmean)); 
  var regImage = fit_img.select(y_band); 
  //apply the equation
  var output = (regImage.subtract(ee.Image(Yint))).divide(ee.Image(slope)); 
  
  //convert values above 100 to 100 and values below 0 to 0 
  //first find the areas that need to be changed
  var mask = output.gte(0).and(output.lte(100)); 
  var masked = output.updateMask(mask); 
  //this updates the values at those locations with a constant value 
  fittedImg = masked.unmask(ee.Image(100).updateMask(output.gt(100)))
                    .unmask(ee.Image(0).updateMask(output.lt(0))); 
  return output; 
}; 

//test for a single year 
var fittedImg = rmaCanopyCover(training,'first','nbr',sample_img); 
Map.addLayer(fittedImg,map_palette,'output'); 
 
/////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////Make a time series of Canopy cover outputs //////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
var canopy_ts = band_names.map(function(bn){
  bn = ee.String(bn); 
  var input_img = nbr.select([bn],['nbr']); 
  var yr_classified = rmaCanopyCover(training,'first','nbr',input_img); 
 
  var year = bn.slice(-4); 
  return yr_classified.select(['nbr'],[bn]).set('year',year).set('system:time_start',year); 
}); 

canopy_ts = ee.ImageCollection.fromImages(canopy_ts).sort('year'); 

//make an image from the imageCollection - note that for some reason its appending a number to the leading places and throwing an error
var multibandImg = canopy_ts.toBands(); 
//fix the band name issue 
var new_img_bands = multibandImg.bandNames().map(function(name){
  name = ee.String(name); 
  return name.slice(-7); 
}); 

multibandImg = multibandImg.select(multibandImg.bandNames(),new_img_bands)

print(canopy_ts, 'canopy cover');
print(multibandImg,'multi band img')

// Map.addLayer(canopy_ts.filter(ee.Filter.eq('year','1995')),map_palette,'1990')
// Map.addLayer(canopy_ts.filter(ee.Filter.eq('year','2000')),map_palette,'2000')
// Map.addLayer(canopy_ts.filter(ee.Filter.eq('year','2015')),map_palette,'2020')

// Export.image.toAsset({
//   image:multibandImg, 
//   description:'reem_canopy_cover_2000_pts_rma_nbr_timeseries_remapped_full', 
//   assetId:'reem_cf_outputs/reem_canopy_cover_2000_pts_rma_nbr_timeseries_remapped_full',
//   scale:30, 
//   maxPixels:1e13,
//   region:aoi
// }); 


/////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////Now make delta images from the canopy cover stack ///////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
var backwardsDifference = function(array) {
  var right = array.arraySlice(0, 0, -1); 
  var left = array.arraySlice(0, 1); 
  return left.subtract(right); 
}; 

//make a deltas array image 
var shiftedCanopyCover = backwardsDifference(multibandImg.toArray());
print(shiftedCanopyCover)
Map.addLayer(shiftedCanopyCover,{},'deltas arr')
Map.addLayer(multibandImg.toArray(),{},'multiband img arr')
// //in case you want to go back to a multiband image
var shiftedCanopyCoverImg = shiftedCanopyCover.arrayFlatten([nbr.bandNames().slice(1)])
print(shiftedCanopyCoverImg)
// Map.addLayer(shiftedNDVIimg,{},'ndvi image')
// Export.image.toAsset({
//   image:shiftedCanopyCoverImg, 
//   description:'reem_canopy_cover_deltas_full', 
//   assetId:'reem_cf_outputs/reem_canopy_cover_deltas_full',
//   scale:30, 
//   region:aoi, 
//   maxPixels:1e13
// }); 

/////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////Apply reducers to get zonal stats for CFs ///////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
var cambodiaCFs = ee.FeatureCollection('users/ak_glaciers/All_CF_Cambodia_July_2016'); 
Map.addLayer(cambodiaCFs,{},'cambodia cfs')
print(cambodiaCFs, 'all cfs')
var example_cf = cambodiaCFs.filter(ee.Filter.eq('CF_Name_En','Torb Cheang')); 
Map.addLayer(example_cf,{},'example cf')
print(example_cf, 'example cf')
//make some figure outputs 
//Long-Term Time Series
var example = ui.Chart.image.seriesByRegion({
  imageCollection:canopy_ts,
  regions: example_cf.geometry(), 
  reducer: ee.Reducer.mean(),
  scale:30, 
  xProperty:'year'
  
}).setOptions({
title: 'RMA NBR-based Canopy Cover',
vAxis: {title: '% canopy cover'},
});
print(example);

var cf_list = cambodiaCFs.aggregate_array('CF_Name_En'); 

/////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////Add in the disturbance detection stuff //////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
var multibandMask = shiftedCanopyCoverImg.lte(-15); 
var maskedDeltas = shiftedCanopyCoverImg.updateMask(multibandMask); 
Map.addLayer(maskedDeltas,{},'masked deltas'); 






////////////////////////////////////////////////////////////////////////////////////////////
//deprecated 
//try truncation
  // var mask = fittedImg.gte(0).and(fittedImg.lte(100)); 
  // fittedImg = fittedImg.updateMask(mask); 
  
  //instead of truncating maybe try rescaling instead 
  //calculate the min and max value of an image
  // var minMax = yr_classified.reduceRegion({
  //   reducer: ee.Reducer.minMax(),
  //   geometry: yr_classified.geometry(),
  //   scale: 30,
  //   maxPixels: 1e13,
  //   // tileScale: 16
  // }); 
  // // use unit scale to normalize the pixel values
  
  // yr_classified = yr_classified.unitScale(ee.Number(minMax
  //               .get(ee.String('nbr').cat('_min'))), ee.Number(minMax
  //               .get(ee.String('nbr').cat('_max'))))
           
  //                 .multiply(100);
  
  
Map.addLayer(forest_cover.clip(aoi),map_palette,'clipped')