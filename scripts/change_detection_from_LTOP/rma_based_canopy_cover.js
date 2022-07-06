var geometry = 
    /* color: #d63000 */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[104.05223485948095, 14.010262376815325],
          [104.05223485948095, 12.791948747380491],
          [106.73289892198095, 12.791948747380491],
          [106.73289892198095, 14.010262376815325]]], null, false);

//######################################################################################################## 
//#                                                                                                    #\\
//#                              Create yearly canopy cover maps using RMA                             #\\
//#                                                                                                    #\\
//########################################################################################################

// date: 2022-6-30
// author: Ben Roberts-Pierel | robertsb@oregonstate.edu
//         Peter Clary        | clarype@oregonstate.edu
//         Robert Kennedy     | rkennedy@coas.oregonstate.edu    
// website: https://github.com/eMapR/LT-GEE

//This script uses an existing canopy cover product (Hansen or GFCC) and predictors from temporally stabilized 
//imagery from the LandTrendr algorithm. The approach currently relies on reduced major axis (RMA) regression for the modeling approach.

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////User inputs//////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////
//first get some user inputs and imports. A few notes: 
// 1. label is based on the reducer that is being used for training data creation below. This could be changed
// 2. yr_XXXX is from the structure of the temporally fitted data (ftv or fit) and should align with the year of forest cover from GFCC or Hansen
// 3. canopy_band is dictated by the target dataset (GFCC or Hansen)
// 4. Map palette just creates a green palette for visualizing the outputs 
// 5. nbr etc comes from the fitted imagery. RMA is just set up as a bivariate thing but may be expanded in the future

var label = 'first'; 
// var bands = ['ndvi','nbr']; //this was originally set up as a bivariate thing, could be changed in the future
var yr_band = 'yr_2000'; 
var startYear = 1990; 
var endYear = 2021; 
var canopy_band = 'treecover2000'; 
var place = 'test_geometry'; 
var map_palette = {min: 0, max: 100, palette: ['ffffff', '004000']};
//LTOP fitted outputs
// var ndvi = ee.Image('users/ak_glaciers/NDVI_fitted_image_stack_from_LTOP_1990_start'); 
var nbr = ee.Image('users/ak_glaciers/NBR_fitted_image_stack_from_LTOP_1990_start'); 
//following two args are optional and were from the original development of this script 
var cambodiaCFs = ee.FeatureCollection('users/ak_glaciers/All_CF_Cambodia_July_2016'); 
var stats_aoi_name = 'Torb Cheang'; 
Map.addLayer(nbr.select('yr_2000'),{},'nbr');

///////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////Get additional inputs/////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////

// var aoi = ee.FeatureCollection("USDOS/LSIB/2017").filter(ee.Filter.eq('COUNTRY_NA',place)).geometry();//.buffer(5000);
var aoi = geometry;
//Use for GFCC
//get the train data into a usable format because its weirdly formatted
// var forest_cover = ee.ImageCollection("NASA/MEASURES/GFCC/TC/v3").filterBounds(aoi)
//                                                                 .filter(ee.Filter.eq('year',2015))
//                                                                 .max()
//                                                                 .select('tree_canopy_cover')

// forest_cover = forest_cover.select('tree_canopy_cover').mosaic(); 

//try for Hansen instead of GFCC
var forest_cover = ee.Image("UMD/hansen/global_forest_change_2020_v1_8").select('treecover2000'); 
Map.addLayer(forest_cover,map_palette,'hansen forest cover')

///////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////Prep data for training/////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////
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
//this wasn't working well with every % cover treated as a class so try aggregating the data to reduce dimensionality
var forest_cover_reclass = forest_cover.divide(20).ceil().toInt();

var train_pts = forest_cover_reclass.stratifiedSample({
  numPoints:400, //this is hardcoded and could be changed
  classBand:canopy_band, 
  scale:30, 
  projection:'EPSG:4326',
  geometries:true, 
  region:aoi
  
}); 

//i think because there are so many pixels with a value of zero we're still oversampling this. 
//i guess we should just force that number down? We can do this with the random column we're creating for the 
//validation/train split 
//allocate some pts to train and some to validation
train_pts = train_pts.randomColumn();
//before we split, supress the 0 points - this probably needs to be amended
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

/////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////Visualize the training data distributions /////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
//plot the training data
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

/////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////Try the RMA model ////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
//from the RMA paper (cohen et al)

//try with just canopy cover and NBR 
//define a function that makes the rma canopy cover callable 
//note that calc_img is whatever image you're using to fit the reg equation and fit img is whatever 
//you want to use to apply the coefficients 
var rmaCanopyCover = function(training,x_band,y_band,fit_img){
  
  var Xstd = ee.Number(training.aggregate_stats(x_band).get('total_sd')); //get population SD
  var Ystd = ee.Number(training.aggregate_stats(y_band).get('total_sd'));
  var Xmean = ee.Number(training.aggregate_stats(x_band).get('mean'));
  var Ymean = ee.Number(training.aggregate_stats(y_band).get('mean'));
  
  //now calculate b0 and b1 according to the RMA formula 
  var slope = Ystd.divide(Xstd); 
  var Yint = Ymean.subtract(slope.multiply(Xmean)); 
  var regImage = fit_img.select(y_band); 
  //apply the equation
  var output = (regImage.subtract(ee.Image(Yint))).divide(ee.Image(slope)); 
  
  //convert values above 100 to 100 and values below 0 to 0 
  //first find the areas that need to be changed
  var mask = output.gte(0).and(output.lte(100)); 
  var masked = output.updateMask(mask); 
  //this updates the values at those locations with a constant value - not sure if this is the best way to handle this
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

//export the time series of annual canopy cover as a multiband image
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
//in case you want to go back to a multiband image
var shiftedCanopyCoverImg = shiftedCanopyCover.arrayFlatten([nbr.bandNames().slice(1)])
print(shiftedCanopyCoverImg)

//export the deltas
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

// var example_cf = cambodiaCFs.filter(ee.Filter.eq('CF_Name_En','Torb Cheang')); 

// //make some figure outputs 
// //Long-Term Time Series
// var example = ui.Chart.image.seriesByRegion({
//   imageCollection:canopy_ts,
//   regions: example_cf.geometry(), 
//   reducer: ee.Reducer.mean(),
//   scale:30, 
//   xProperty:'year'
  
// }).setOptions({
// title: 'RMA NBR-based Canopy Cover',
// vAxis: {title: '% canopy cover'},
// });
// print(example);

// var cf_list = cambodiaCFs.aggregate_array('CF_Name_En'); 

/////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////Disturbance detection ///////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
var multibandMask = shiftedCanopyCoverImg.lte(-15); 
var maskedDeltas = shiftedCanopyCoverImg.updateMask(multibandMask); 
Map.addLayer(maskedDeltas,{},'masked deltas'); 
