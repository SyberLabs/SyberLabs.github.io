import numpy as np, zlib, base64, json, math
from collections import deque
from PIL import Image
mos=np.load('mosaic.npy')
W=1024; LAT0=85.0; step=360/W; H=int(round(2*LAT0/step))  # 484
lats=LAT0-(np.arange(H)+0.5)*step
lons=-180+(np.arange(W)+0.5)*step
ym=(1-np.log(np.tan(np.pi/4+np.radians(lats)/2))/np.pi)/2*1024-0.5
xm=(lons+180)/360*1024-0.5
def bil(Y,X):
    y0=np.clip(np.floor(Y).astype(int),0,1022); x0=np.floor(X).astype(int)
    fy=np.clip(Y-y0,0,1); fx=X-x0
    x0m=x0%1024; x1=(x0+1)%1024
    a=mos[y0][:,x0m]; b=mos[y0][:,x1]; c=mos[y0+1][:,x0m]; d=mos[y0+1][:,x1]
    fy=fy[:,None]; fx=fx[None,:]
    return a*(1-fy)*(1-fx)+b*(1-fy)*fx+c*fy*(1-fx)+d*fy*fx
E=bil(ym,xm)
np.save('equi.npy',E)
# ocean connectivity at sea level 0
below=E<0
seen=np.zeros_like(below)
q=deque()
# seeds: deep ocean cells
for (r,c) in [(np.argmin(np.abs(lats-0)),np.argmin(np.abs(lons+140))),(np.argmin(np.abs(lats+40)),np.argmin(np.abs(lons+20))),(np.argmin(np.abs(lats+30)),np.argmin(np.abs(lons-80)))]:
    assert below[r,c]; seen[r,c]=True; q.append((r,c))
while q:
    r,c=q.popleft()
    for dr,dc in ((1,0),(-1,0),(0,1),(0,-1)):
        rr=r+dr; cc=(c+dc)%W
        if 0<=rr<H and below[rr,cc] and not seen[rr,cc]:
            seen[rr,cc]=True; q.append((rr,cc))
inland=below & ~seen
print('inland cells',inland.sum())
v=np.clip(np.round((E+140)/0.6),0,255).astype(np.uint8)
v[inland]=0
raw=v.tobytes()
z=zlib.compress(raw,9)
print('grid',W,H,'zlib',len(z),'b64',len(base64.b64encode(z)))
open('../data/grid.b64','w').write(base64.b64encode(z).decode())
# check image
img=np.zeros((H,W,3),np.uint8); img[v>0]=(60,50,40); img[E>-120]=(120,90,50); img[v==0]=(0,0,0); img[E>0]=(220,200,170); img[inland]=(40,80,160)
Image.fromarray(img).save('equi_check.png')
# Mega-Chad: flood from Bodele below 330m within bbox
lev=330
r0=np.argmin(np.abs(lats-16.8)); c0=np.argmin(np.abs(lons-17.6))
print('bodele elev',E[r0,c0])
m=np.zeros((H,W),bool); q=deque([(r0,c0)]); m[r0,c0]=True
while q:
    r,c=q.popleft()
    for dr,dc in ((1,0),(-1,0),(0,1),(0,-1)):
        rr=r+dr; cc=c+dc
        if 0<=rr<H and 0<=cc<W and not m[rr,cc] and E[rr,cc]<lev and 4<lats[rr]<24 and 8<lons[cc]<28:
            m[rr,cc]=True; q.append((rr,cc))
print('megachad cells',m.sum(),'area km2 ~',m.sum()*(39*39))
np.save('megachad.npy',m)
