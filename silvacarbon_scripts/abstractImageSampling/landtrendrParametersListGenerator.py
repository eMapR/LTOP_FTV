
# This program is designed to create a list of landTrendr parameters varations. The parameter varations 
# are drawn from lists of parameter values.


# output file path (txt file)
outFile = ""

# list of parameter confingations
Segments = [6,8,10,11]
#Segments = [6,9,11]
spike = [0.75,0.90,1.0]
#spike = [0.75,0.90,1.0]
recovery = [0.25,0.50,0.90,1.0]
#recovery = [0.25,0.65,1.0]
pValue = [0.05,0.10,0.15]

list = []
for seg in Segments:
    for ske in spike:
        for rec in recovery:
            for pv in pValue:
                newlist = [seg,ske,rec,pv]
                list.append(newlist)
                print('newlist', newlist)

# make empty list. this will parameters appended to it
parameterDicList = []

# iterator 
for subList in list:

# asign each parameter to template 
    ltParamTemplate = "{timeSeries: ee.ImageCollection([]), maxSegments: "+str(subList[0])+" , spikeThreshold: "+str(subList[1])+", vertexCountOvershoot: 3, preventOneYearRecovery: true, recoveryThreshold: "+str(subList[2])+", pvalThreshold: "+str(subList[3])+", bestModelProportion: 0.25, minObservationsNeeded: "+str(subList[0])+" }"

# append completed parameters dicionary to emtpy list 
    parameterDicList.append(ltParamTemplate)

# end iterator 
print(parameterDicList)

# add list to text file
#export file
with open("./LT_parameter_varations_list_dic_144.txt", "w") as output:
    output.write(str(parameterDicList))

