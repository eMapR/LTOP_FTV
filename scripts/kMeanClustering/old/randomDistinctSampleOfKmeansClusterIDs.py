'''
randomDistinctSampleOfKmeansClusterIDs.py

Overview:

Author: Peter Clary (clarype@oregonstate.edu)

Inputs:

Output:

Usage:


'''

# import
from osgeo import ogr
import sys
import os
import math
from numpy import random 
#__________________________________________


def readInShp(infile):


    driver = ogr.GetDriverByName('ESRI Shapefile')
    dataSource = driver.Open(infile, 1) # 0 means read-only. 1 means writeable.
    memlayer = dataSource.GetLayer()
    

    # Add a new field
    # add column for random numbers
    new_field = ogr.FieldDefn('ranNum', ogr.OFTInteger)
    memlayer.CreateField(new_field)


    # add column for random numbers
    new_field2 = ogr.FieldDefn('rep', ogr.OFTInteger)
    memlayer.CreateField(new_field2)

    valueList = [ feature.GetField("cluster_id") for feature in memlayer ]
    max1 = int(max(valueList)+1)
    min1 = int(min(valueList))

    print('Number of Features',memlayer.GetFeatureCount())

    # loops over the range of cluster ids. so if the max value in the feild cluster_id is 5000, 5000 iteration will occur
    for cluster in list(range(min1,max1)):

        print(cluster)

        # filter and group shp file by value, in this case Cluster ID, making a object where each feature has the same cluster id 
        memlayer.SetAttributeFilter('cluster_id = '+str(cluster))

        filteredFeatureList = []
  
        # for a filtered group asign random numbers to each feature in the group
        for feature in memlayer:
            randomNumber = random.randint(1000000)
            filteredFeatureList.append(randomNumber)
            feature.SetField('ranNum',randomNumber)
            memlayer.SetFeature(feature)

        rep = min(filteredFeatureList)

        # select feature with the lowest random value from group 
        memlayer.SetAttributeFilter('ranNum = '+str(rep)+' and cluster_id = '+str(cluster) )

        filteredFeatureList = []

        for feature1 in memlayer:
            feature1.SetField('rep',1)
            memlayer.SetFeature(feature1)
            break
    	
#__________________________________________


def main():

    script = sys.argv[0]
    file1 = sys.argv[1]



    if os.path.exists(file1):
        print(file1,' : is real')
    else:
        print('Check the first pathway you entered.')

    print(readInShp(file1))


if __name__ == '__main__':
    main()

print('complete')
sys.exit()


