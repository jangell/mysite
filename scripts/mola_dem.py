# Jason Angell
# SETI Institute / NASA Ames Research Center
# 25 April 2018

# Script to read in MOLA digital elevation model data at 128px/deg and export to a more useable / manageable format
# Reads in downloaded data from http://pds-geosciences.wustl.edu/missions/mgs/megdr.html
# Exports [format tbd] elevation data

import struct, os, pdb
import numpy as np
import matplotlib.pyplot as plt

# converts 2 bytes (16 bits) of binary to integer
def b2i(b):
	i = struct.unpack('>h', b)[0]
	return i

dpath = '/Users/Jason/Documents/mysite/mysite/scripts/mola_src'

# returns the name of the .img file
# this doesn't do type or value checking, but probably should
# reference: http://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/aareadme.txt
# lat: upper left latitute (positive / negative is translated to n/s)
# lon: upper left east longitude
# res: resolution in pix/deg
# type: topo by default
# ver: version, b by default
def getImgPath(lat, lon, res, typ='t', ver='b'):
	try:
		prepath = os.path.join(dpath, '{}dpp'.format(res))
		ns = 'n'
		if(lat < 0):
			ns = 's'
		fname = 'megt{}{}{}{}{}{}.img'.format(lat, ns, lon, res, typ, ver)
		return os.path.join(prepath, fname)
	except Exception as e:
		print 'failed to generate path based on the following exception:'
		print e

# returns the name of the .img file
# reference: http://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/aareadme.txt
# lat: upper left latitute (positive / negative is translated to n/s)
# lon: upper left east longitude
# res: resolution in pix/deg
# type: topo by default
# ver: version, b by default
def getLblPath(lat, lon, res, type='t', ver='b'):
	try:
		prepath = os.path.join(dpath, '{}dpp'.format(res))
		ns = 'n'
		if(lat < 0):
			ns = 's'
		fname = 'megt{}{}{}{}{}{}.lbl'.format(lat, ns, lon, res, typ, ver)
		return os.path.join(prepath, fname)
	except Exception as e:
		print 'failed to generate path based on the following exception:'
		print e

# reads a .lbl file and returns the data as a dictionary
# fpath: path to the .lbl file
def readLabelData(fpath):
	try:
		to_ret = {}
		with open(fpath, 'r') as f:
			#for line in f.
			lines = f.readlines()
			line_ind = 0
			cur_pair = None
			while line_ind < len(lines):
				line = lines[line_ind]
				if '=' in line:
					# this is a new pair, so add the last pair to the master dict
					if cur_pair:
						to_ret[cur_pair[0]] = cur_pair[1]
					# then get the next one
					parts = line.split('=')
					cur_pair = [parts[0].strip(), parts[1].strip()]
				else:
					# this is not a new pair, just a continuation of the value of the old one (like description or something), so append it
					cur_pair[1] += ' '+line.strip()
				line_ind += 1
			# add the last pair to the master dict
			to_ret[cur_pair[0]] = cur_pair[1]
		return to_ret
	
	except Exception as e:
		print 'Failed to read label data from {}. Exception:'.format(fpath)
		print e
		return None

# valid res: [4, 16, 32, 64, 128]
# valid for res 4, 16, 32: no lat lon (lat=90 lon=0 only)
# valid for res 64: lat in [90, 0], lon in [0, 180]
# valid for res 128: lat in [88, 44, 0, -44], lon in [0, 90, 180, 270]
class DEM:
	valid_res = [4, 16, 32, 64, 128]
	valid_lat = {4:[90], 16:[90], 32:[90], 64:[90,0], 128:[88,44,0,-44]}
	valid_lon = {4:[0], 16:[0], 32:[0], 64:[0,180], 128:[0,90,180,270]}
	res_letters = {4:'c', 16:'e', 32:'f', 64:'g', 128:'h'}

	dpath = '/Users/Jason/Documents/mysite/mysite/scripts/mola_src'

	def __init__(self, res, lat=90, lon=0):
		# validate res, lat, and lon
		if res not in DEM.valid_res:
			print 'Could not instantiate DEM. Res must be in {}, res was {}'.format(DEM.valid_res, res)
			return None
		if lat not in DEM.valid_lat[res]:
			print 'Could not instantiate DEM. Lat for res {} must be in {}, lat was {}'.format(res, DEM.valid_lat[res], lat)
			return None
		if lon not in DEM.valid_lon[res]:
			print 'Could not instantiate DEM. Lon for res {} must be in {}, lon was {}'.format(res, DEM.valid_lon[res], lon)
			return None

		# set resolution, lat, and lon
		self.res = res
		self.lat = lat
		self.lon = lon

		ns = 'n'
		if(lat < 0):
			ns = 's'
		res_let = DEM.res_letters[res]
		self.lbl_path = os.path.join(DEM.dpath, '{}dpp'.format(res), 'megt{:02d}{}{:03d}{}b.lbl'.format(lat, ns, lon, res_let))
		self.img_path = os.path.join(DEM.dpath, '{}dpp'.format(res), 'megt{:02d}{}{:03d}{}b.img'.format(lat, ns, lon, res_let))

		# read in label data on init (save reading in img data for self.readData() call)
		lbl_data = readLabelData(self.lbl_path)
		self.n_lines = int(lbl_data['LINES'])
		self.n_line_samples = int(lbl_data['LINE_SAMPLES'])
		
		self.data = None

	# check if data has been read in for this dem yet
	def hasDataBeenRead(self):
		return self.data != None
	
	# reads in the data from img file
	def readData(self):
		try:
			lines = []
			with open(self.img_path, 'r') as f:
				for i in range(self.n_lines):
					cur_line = []
					for j in range(self.n_line_samples):
						cur_line.append(b2i(f.read(2)))
					lines.append(cur_line)
			self.data = lines
			return True
		except Exception as e:
			print "Failed to read in MOLA DEM data file. Exception:"
			print e
			return False

	def getDataAsNPArray(self):
		if self.hasDataBeenRead():
			return np.array(self.data)
		return None


if __name__ == '__main__':
	dem = DEM(4)
	dem.readData()

	fig = plt.figure(figsize = (16, 9))
	plt.imshow(dem.getDataAsNPArray(), cmap='terrain')
	plt.colorbar()
	plt.show()
