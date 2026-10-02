"""Voxelised inside/outside + depth field for a closed-ish triangle mesh (HRA skin), by even-odd scanline crossings along x."""
import numpy as np
from scipy import ndimage

class Solid:
    def __init__(self, V, T, h=0.004, pad=0.05):
        V = np.asarray(V, np.float64); T = np.asarray(T)
        self.h = h; lo = V.min(0) - pad; hi = V.max(0) + pad
        self.lo = lo; self.n = np.ceil((hi - lo) / h).astype(int) + 1   # nx, ny, nz
        nx, ny, nz = self.n
        A, B, C = V[T[:, 0]], V[T[:, 1]], V[T[:, 2]]
        # rows are (iy, iz) lines along x; for each triangle find rows inside its (y,z) bbox and intersect
        ey = ((np.stack([A[:, 1], B[:, 1], C[:, 1]], 1) - lo[1]) / h)
        ez = ((np.stack([A[:, 2], B[:, 2], C[:, 2]], 1) - lo[2]) / h)
        y0 = np.ceil(ey.min(1)).astype(int); y1 = np.floor(ey.max(1)).astype(int)
        z0 = np.ceil(ez.min(1)).astype(int); z1 = np.floor(ez.max(1)).astype(int)
        cnt = np.maximum(y1 - y0 + 1, 0) * np.maximum(z1 - z0 + 1, 0)
        keep = cnt > 0
        idx = np.repeat(np.nonzero(keep)[0], cnt[keep]); c = cnt[keep]
        off = np.arange(c.sum()) - np.repeat(np.cumsum(c) - c, c)
        wz = (z1 - z0 + 1)[idx]
        iy = y0[idx] + off // wz; iz = z0[idx] + off % wz
        # barycentric solve in (y,z)
        a, b, cc = A[idx], B[idx], C[idx]
        py = lo[1] + iy * h; pz = lo[2] + iz * h
        d = (b[:, 1] - a[:, 1]) * (cc[:, 2] - a[:, 2]) - (cc[:, 1] - a[:, 1]) * (b[:, 2] - a[:, 2])
        ok = np.abs(d) > 1e-14
        u = ((py - a[:, 1]) * (cc[:, 2] - a[:, 2]) - (cc[:, 1] - a[:, 1]) * (pz - a[:, 2])) / np.where(ok, d, 1)
        v = ((b[:, 1] - a[:, 1]) * (pz - a[:, 2]) - (py - a[:, 1]) * (b[:, 2] - a[:, 2])) / np.where(ok, d, 1)
        ins = ok & (u >= 0) & (v >= 0) & (u + v < 1)
        x = a[:, 0] + u * (b[:, 0] - a[:, 0]) + v * (cc[:, 0] - a[:, 0])
        iy, iz, x = iy[ins], iz[ins], x[ins]
        row = iy * nz + iz
        o = np.lexsort((x, row)); row, x = row[o], x[o]
        # even-odd per row; rows with odd counts are repaired by dropping the last crossing
        starts = np.r_[0, np.nonzero(np.diff(row))[0] + 1]; counts = np.diff(np.r_[starts, len(row)])
        grid = np.zeros((ny * nz, nx), np.int8)
        ix = np.clip(np.round((x - lo[0]) / h).astype(int), 0, nx - 1)
        pos_in_row = np.arange(len(row)) - np.repeat(starts, counts)
        keepc = pos_in_row < np.repeat(counts - (counts % 2), counts)
        row, ix, pos_in_row = row[keepc], ix[keepc], pos_in_row[keepc]
        sign = np.where(pos_in_row % 2 == 0, 1, -1)
        np.add.at(grid, (row, ix), sign.astype(np.int8))
        fill = np.cumsum(grid, axis=1) > 0
        self.inside = fill.reshape(ny, nz, nx).transpose(2, 0, 1)          # [x, y, z]
        self.depth = ndimage.distance_transform_edt(self.inside, sampling=h) - ndimage.distance_transform_edt(~self.inside, sampling=h)
    def query(self, P):
        """signed depth in metres (positive = inside) for points P (N,3)."""
        i = np.round((P - self.lo) / self.h).astype(int)
        ok = (i >= 0).all(1) & (i < self.n).all(1)
        out = np.full(len(P), -1.0)
        ii = i[ok]; out[ok] = self.depth[ii[:, 0], ii[:, 1], ii[:, 2]]
        return out
