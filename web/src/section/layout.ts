import { spokeLengthMm } from "../math/spokeLength";

export type SectionSide = "left" | "right";

export interface RimLike {
  erdMm: number;
  innerWidthMm: number;
  wellDepthMm: number;
}

export interface HubLike {
  leftFlangePcdMm: number;
  rightFlangePcdMm: number;
  leftFlangeOffsetMm: number;
  rightFlangeOffsetMm: number;
}

export interface NippleLike {
  headDiameterMm: number;
  headHeightMm: number;
  bodyLengthMm: number;
  shankDiameterMm: number;
  internalThreadLengthMm: number;
}

export interface SectionDiagram {
  viewW: number;
  viewH: number;
  cx: number;
  hubAxisY: number;
  nippleX: number;
  nippleY: number;
  flangeX: number;
  flangeY: number;
  rimPath: string;
  nippleHeadPath: string;
  nippleBodyPath: string;
  nippleThreadZonePath: string;
  headTopY: number;
  rimTopY: number;
  bodyBotY: number;
  scaleMmPerPx: number;
  spokeLengthMm: number;
  flangeOffsetMm: number;
  planarChordMm: number;
}

export function buildSectionLayout(
  rim: RimLike,
  hub: HubLike,
  nipple: NippleLike,
  params: {
    side: SectionSide;
    spokeCount: number;
    crosses: number;
    flangeHoleDiameterMm?: number;
    nippleCorrectionMm?: number;
  },
): SectionDiagram {
  /*
    Section view coordinate frame (SVG):

         -X                +X
          <------ cx ------>          Y grows downward
                    |
                    v +Y

    Main anchors:
      nipple = (cx, nippleY) on rim seat line
      flange = (cx +/- offsetMm*s, nippleY + planarChordMm*s)
  */
  const s = 0.38;
  const cx = 210.0;
  const flangeHoleDiameterMm = params.flangeHoleDiameterMm ?? 0;
  const nippleCorrectionMm = params.nippleCorrectionMm ?? 0;

  let offsetMm: number;
  let pcdMm: number;
  let sign: number;
  if (params.side === "left") {
    offsetMm = hub.leftFlangeOffsetMm;
    pcdMm = hub.leftFlangePcdMm;
    sign = -1.0;
  } else {
    offsetMm = hub.rightFlangeOffsetMm;
    pcdMm = hub.rightFlangePcdMm;
    sign = 1.0;
  }

  const rFlMm = pcdMm / 2.0;
  const raw = spokeLengthMm(
    rim.erdMm,
    rFlMm,
    offsetMm,
    params.crosses,
    params.spokeCount,
  );
  const spokeL =
    raw - flangeHoleDiameterMm / 2.0 + nippleCorrectionMm;

  /*
    Spoke section triangle (right triangle in projected section):

          nipple
            *
            |\
            | \ spokeL
            |  \
  planar    |   \
  chord     |    \
            *-----* flange projection
               w = flange offset

    planarChordMm^2 + w^2 = spokeL^2
    planarChordMm = sqrt(max(spokeL^2 - w^2, 0))
  */
  const w = offsetMm;
  const underChord = spokeL * spokeL - w * w;
  const planarChordMm = Math.sqrt(Math.max(underChord, 0.0));

  const erdRPx = (rim.erdMm / 2.0) * s;
  let hubAxisY = 270.0;
  const nippleY = hubAxisY - erdRPx;
  const nippleX = cx;

  const dxPx = sign * w * s;
  const flangeX = cx + dxPx;
  const dyPx = planarChordMm * s;
  const flangeY = nippleY + dyPx;

  hubAxisY = flangeY + 48.0;

  const innerW = rim.innerWidthMm * s;
  const wellD = rim.wellDepthMm * s;

  const yRimTop = nippleY - wellD;
  const xInL = cx - innerW / 2;
  const xInR = cx + innerW / 2;

  /*
    Rim simple section (straight walls, clockwise rectangle):

      xInL  |----------------------|  xInR   y = yRimTop
            |                      |
            |                      |
      xInL  |----------------------|  xInR   y = nippleY (seat line)

    Path order: top-left -> top-right -> bottom-right -> bottom-left -> close.
  */
  const rimPath =
    `M ${xInL.toFixed(2)} ${yRimTop.toFixed(2)} L ${xInR.toFixed(2)} ${yRimTop.toFixed(2)} ` +
    `L ${xInR.toFixed(2)} ${nippleY.toFixed(2)} L ${xInL.toFixed(2)} ${nippleY.toFixed(2)} Z`;

  const headW = nipple.headDiameterMm * s;
  const headH = nipple.headHeightMm * s;
  const headLeft = nippleX - headW / 2;
  const headTop = nippleY - headH;
  const headBottom = nippleY;
  // Nipple head is a rectangle centered on nippleX, spanning [headTop, headBottom].
  const nippleHeadPath =
    `M ${headLeft.toFixed(2)} ${headTop.toFixed(2)} ` +
    `L ${(headLeft + headW).toFixed(2)} ${headTop.toFixed(2)} ` +
    `L ${(headLeft + headW).toFixed(2)} ${headBottom.toFixed(2)} ` +
    `L ${headLeft.toFixed(2)} ${headBottom.toFixed(2)} Z`;

  const shankW = nipple.shankDiameterMm * s;
  const bodyLen = nipple.bodyLengthMm * s;
  const shankL = nippleX - shankW / 2;
  const shankR = nippleX + shankW / 2;
  const bodyTop = nippleY;
  const bodyBot = nippleY + bodyLen;
  // Nipple body/barrel is a centered rectangle that extends downward from seat.
  const nippleBodyPath =
    `M ${shankL.toFixed(2)} ${bodyTop.toFixed(2)} L ${shankR.toFixed(2)} ${bodyTop.toFixed(2)} ` +
    `L ${shankR.toFixed(2)} ${bodyBot.toFixed(2)} L ${shankL.toFixed(2)} ${bodyBot.toFixed(2)} Z`;

  const threadLenPx = nipple.internalThreadLengthMm * s;
  const threadBot = Math.min(bodyTop + threadLenPx, bodyBot);
  // Thread zone starts at seat/bodyTop and is clamped to body length.
  const nippleThreadZonePath =
    `M ${shankL.toFixed(2)} ${bodyTop.toFixed(2)} L ${shankR.toFixed(2)} ${bodyTop.toFixed(2)} ` +
    `L ${shankR.toFixed(2)} ${threadBot.toFixed(2)} L ${shankL.toFixed(2)} ${threadBot.toFixed(2)} Z`;

  const viewW = 420.0;
  const viewH = 320.0;

  return {
    viewW,
    viewH,
    cx,
    hubAxisY,
    nippleX,
    nippleY,
    flangeX,
    flangeY,
    rimPath,
    nippleHeadPath,
    nippleBodyPath,
    nippleThreadZonePath,
    headTopY: headTop,
    rimTopY: yRimTop,
    bodyBotY: bodyBot,
    scaleMmPerPx: s,
    spokeLengthMm: spokeL,
    flangeOffsetMm: w,
    planarChordMm,
  };
}

export interface SectionDetail {
  viewW: number;
  viewH: number;
  cx: number;
  scale: number;
  rimPath: string;
  rimOuterBorderPath: string;
  rimTopCutoutPath: string;
  rimTopCutoutBorderPath: string;
  rimCavityPath: string;
  nippleHeadPath: string;
  nippleBodyPath: string;
  nippleThreadZonePath: string;
  seatY: number;
  rimOuterY: number;
  rimCavityTopY: number;
  rimCavityBotY: number;
  barrelEndY: number;
  tipY: number;
  hasInnerWallDepth: boolean;
  spokeX: number;
  spokeW: number;
  spokeTopY: number;
  spokeBotY: number;
  spokeH: number;
  spokeThreadBotY: number;
  spokeThreadH: number;
  dimSeatX: number;
  dimRimX: number;
  seatMidDy: number;
  rimMidDy: number;
}

export function buildSectionDetail(
  nipple: NippleLike,
  params: {
    wellDepthMm: number;
    innerWidthMm: number;
    tipFromSeatMm: number;
    spokeThreadLengthMm?: number;
    innerWallDepthMm?: number | null;
  },
): SectionDetail {
  /*
    Detail view stack (not to scale):

      rimOuterY  --------------------  outer crown
                 __\____bowl____/__    top cutout
                   \-- thin --/
                      bridge
      seatY      --------------------  nipple seat plane
                     [head]
                      |  |
                      |  |  nipple body
                      |  |
      barrelEndY  --------------------  barrel end
      tipY        ---- spoke tip ----

    This function builds two rim paths:
      1) rimPath (solid metal)
      2) rimTopCutoutPath (painted top bowl cutout)
      3) rimCavityPath (painted lower cavity overlay)
  */
  const spokeThreadLengthMm = params.spokeThreadLengthMm ?? 0;
  const totalMm = params.wellDepthMm + nipple.bodyLengthMm;
  const paddingMm = totalMm * 0.16;
  const viewH = 300.0;
  const s = viewH / (totalMm + 2 * paddingMm);
  const viewW = 300.0;
  const cx = viewW / 2.0;

  const rimOuterY = paddingMm * s;
  const seatY = rimOuterY + params.wellDepthMm * s;

  const headW = nipple.headDiameterMm * s;
  const headH = nipple.headHeightMm * s;
  const headLeft = cx - headW / 2;
  const headTop = seatY - headH;
  const headBot = seatY;

  const nippleHeadPath =
    `M ${headLeft.toFixed(2)} ${headTop.toFixed(2)} ` +
    `L ${(headLeft + headW).toFixed(2)} ${headTop.toFixed(2)} ` +
    `L ${(headLeft + headW).toFixed(2)} ${headBot.toFixed(2)} ` +
    `L ${headLeft.toFixed(2)} ${headBot.toFixed(2)} Z`;

  const shankW = nipple.shankDiameterMm * s;
  const shankL = cx - shankW / 2;
  const shankR = cx + shankW / 2;
  const barrelEndY = seatY + nipple.bodyLengthMm * s;

  const nippleBodyPath =
    `M ${shankL.toFixed(2)} ${seatY.toFixed(2)} L ${shankR.toFixed(2)} ${seatY.toFixed(2)} ` +
    `L ${shankR.toFixed(2)} ${barrelEndY.toFixed(2)} L ${shankL.toFixed(2)} ${barrelEndY.toFixed(2)} Z`;

  const threadBot = Math.min(
    seatY + nipple.internalThreadLengthMm * s,
    barrelEndY,
  );
  const nippleThreadZonePath =
    `M ${shankL.toFixed(2)} ${seatY.toFixed(2)} L ${shankR.toFixed(2)} ${seatY.toFixed(2)} ` +
    `L ${shankR.toFixed(2)} ${threadBot.toFixed(2)} L ${shankL.toFixed(2)} ${threadBot.toFixed(2)} Z`;

  /*
    Rim profile guide points (straight side walls):

      xInL                       xInR
        |---------------------------|  rimOuterY
        |                           |
        |                           |
        |         U-bed             |
         \_________ cx ____________/
                  seatY / uBotY

    Curves:
      Q = quarter-round at top corners (radius r)
      C = smooth U-bed crown
  */
  const innerW = params.innerWidthMm * s;
  const xInL = cx - innerW / 2;
  const xInR = cx + innerW / 2;

  const wellPx = seatY - rimOuterY;
  const r = Math.min(2.5 * s, wellPx * 0.06, innerW * 0.08);

  const uExtMm = Math.max(1.5, params.wellDepthMm * 0.09);
  const uExt = uExtMm * s;

  const bendY = seatY - wellPx * 0.18;
  const uBotY = seatY + uExt;
  const uHalf = shankW / 2 + 6;

  const hasIwd = params.innerWallDepthMm != null;

  /*
    rimPath command walk (clockwise):
      M/L top edge with corner radius lead-in
      Q top-right round
      L down right wall
      C through U-bottom center
      mirrored C/L on left
      Q top-left round
      Z close
  */
  const rimPath =
    `M ${(xInL + r).toFixed(2)} ${rimOuterY.toFixed(2)} ` +
    `L ${(xInR - r).toFixed(2)} ${rimOuterY.toFixed(2)} ` +
    `Q ${xInR.toFixed(2)} ${rimOuterY.toFixed(2)} ${xInR.toFixed(2)} ${(rimOuterY + r).toFixed(2)} ` +
    `L ${xInR.toFixed(2)} ${bendY.toFixed(2)} ` +
    `C ${xInR.toFixed(2)} ${seatY.toFixed(2)} ` +
    `${(cx + uHalf).toFixed(2)} ${uBotY.toFixed(2)} ` +
    `${cx.toFixed(2)} ${uBotY.toFixed(2)} ` +
    `C ${(cx - uHalf).toFixed(2)} ${uBotY.toFixed(2)} ` +
    `${xInL.toFixed(2)} ${seatY.toFixed(2)} ` +
    `${xInL.toFixed(2)} ${bendY.toFixed(2)} ` +
    `L ${xInL.toFixed(2)} ${(rimOuterY + r).toFixed(2)} ` +
    `Q ${xInL.toFixed(2)} ${rimOuterY.toFixed(2)} ${(xInL + r).toFixed(2)} ${rimOuterY.toFixed(2)} ` +
    "Z";
  const rimOuterBorderPath =
    `M ${(xInL + r).toFixed(2)} ${rimOuterY.toFixed(2)} ` +
    `Q ${xInL.toFixed(2)} ${rimOuterY.toFixed(2)} ${xInL.toFixed(2)} ${(rimOuterY + r).toFixed(2)} ` +
    `L ${xInL.toFixed(2)} ${bendY.toFixed(2)} ` +
    `C ${xInL.toFixed(2)} ${seatY.toFixed(2)} ` +
    `${(cx - uHalf).toFixed(2)} ${uBotY.toFixed(2)} ` +
    `${cx.toFixed(2)} ${uBotY.toFixed(2)} ` +
    `C ${(cx + uHalf).toFixed(2)} ${uBotY.toFixed(2)} ` +
    `${xInR.toFixed(2)} ${seatY.toFixed(2)} ` +
    `${xInR.toFixed(2)} ${bendY.toFixed(2)} ` +
    `L ${xInR.toFixed(2)} ${(rimOuterY + r).toFixed(2)} ` +
    `Q ${xInR.toFixed(2)} ${rimOuterY.toFixed(2)} ${(xInR - r).toFixed(2)} ${rimOuterY.toFixed(2)}`;

  /*
    Cavity is its own filled path layered on top (no even-odd fill rule).

    Thickness model:
      sideT  = side wall thickness
      innerT = material left above seat
      cavTopY/cavBotY define vertical cavity window
  */
  const sideTMm = Math.max(1.2, params.wellDepthMm * 0.07);
  const sideT = sideTMm * s;

  let cavTopY: number;
  if (hasIwd) {
    cavTopY = rimOuterY + params.innerWallDepthMm! * s;
  } else {
    const outerTMm = Math.max(2.0, params.wellDepthMm * 0.12);
    cavTopY = rimOuterY + outerTMm * s;
  }

  const innerTMm = Math.max(1.5, params.wellDepthMm * 0.09);
  const innerT = innerTMm * s;
  const cavBotY = seatY - innerT;
  const cavL = xInL + sideT;
  const cavR = xInR - sideT;

  const cr = Math.min(
    1.5 * s,
    Math.max(cavBotY - cavTopY, 1.0) * 0.08,
    (cavR - cavL) * 0.06,
  );

  /*
    Top bowl cutout: an additional overlay carved down from rimOuterY.
    Keep a thin bridge to the cavity by stopping above cavTopY.
  */
  const topSideTMm = Math.max(1.0, params.innerWidthMm * 0.06);
  const maxTopSideT = (xInR - xInL) * 0.3;
  const topSideT = Math.min(topSideTMm * s, maxTopSideT);
  const topCutL = xInL + topSideT;
  const topCutR = xInR - topSideT;
  const bridgeTMm = Math.max(0.35, params.wellDepthMm * 0.015);
  const bridgeT = bridgeTMm * s;
  const minTopCutDepth = Math.max(1.4 * s, wellPx * 0.12);
  const maxTopCutBot = cavTopY - Math.max(bridgeT, 0.2 * s);
  const requestedTopCutBot = rimOuterY + minTopCutDepth;
  const topCutBotY = Math.min(requestedTopCutBot, maxTopCutBot);
  const topCutRounding = Math.min(
    1.6 * s,
    Math.max(topCutBotY - rimOuterY, 1.0) * 0.22,
    Math.max(topCutR - topCutL, 1.0) * 0.10,
  );
  const rimTopCutoutPath =
    `M ${topCutL.toFixed(2)} ${rimOuterY.toFixed(2)} ` +
    `L ${topCutR.toFixed(2)} ${rimOuterY.toFixed(2)} ` +
    `L ${topCutR.toFixed(2)} ${(topCutBotY - topCutRounding).toFixed(2)} ` +
    `Q ${topCutR.toFixed(2)} ${topCutBotY.toFixed(2)} ${(topCutR - topCutRounding).toFixed(2)} ${topCutBotY.toFixed(2)} ` +
    `L ${(topCutL + topCutRounding).toFixed(2)} ${topCutBotY.toFixed(2)} ` +
    `Q ${topCutL.toFixed(2)} ${topCutBotY.toFixed(2)} ${topCutL.toFixed(2)} ${(topCutBotY - topCutRounding).toFixed(2)} ` +
    "Z";
  const rimTopCutoutBorderPath =
    `M ${topCutL.toFixed(2)} ${rimOuterY.toFixed(2)} ` +
    `L ${topCutL.toFixed(2)} ${(topCutBotY - topCutRounding).toFixed(2)} ` +
    `Q ${topCutL.toFixed(2)} ${topCutBotY.toFixed(2)} ${(topCutL + topCutRounding).toFixed(2)} ${topCutBotY.toFixed(2)} ` +
    `L ${(topCutR - topCutRounding).toFixed(2)} ${topCutBotY.toFixed(2)} ` +
    `Q ${topCutR.toFixed(2)} ${topCutBotY.toFixed(2)} ${topCutR.toFixed(2)} ${(topCutBotY - topCutRounding).toFixed(2)} ` +
    `L ${topCutR.toFixed(2)} ${rimOuterY.toFixed(2)}`;

  let rimCavityPath: string;
  if (hasIwd) {
    /*
      Inner-wall-depth constrained cavity (rounded rectangle):

         cavL +-------------------+ cavR   cavTopY
              |                   |
              |                   |
              +-------------------+         cavBotY
    */
    rimCavityPath =
      `M ${(cavL + cr).toFixed(2)} ${cavTopY.toFixed(2)} ` +
      `L ${(cavR - cr).toFixed(2)} ${cavTopY.toFixed(2)} ` +
      `Q ${cavR.toFixed(2)} ${cavTopY.toFixed(2)} ${cavR.toFixed(2)} ${(cavTopY + cr).toFixed(2)} ` +
      `L ${cavR.toFixed(2)} ${(cavBotY - cr).toFixed(2)} ` +
      `Q ${cavR.toFixed(2)} ${cavBotY.toFixed(2)} ${(cavR - cr).toFixed(2)} ${cavBotY.toFixed(2)} ` +
      `L ${(cavL + cr).toFixed(2)} ${cavBotY.toFixed(2)} ` +
      `Q ${cavL.toFixed(2)} ${cavBotY.toFixed(2)} ${cavL.toFixed(2)} ${(cavBotY - cr).toFixed(2)} ` +
      `L ${cavL.toFixed(2)} ${(cavTopY + cr).toFixed(2)} ` +
      `Q ${cavL.toFixed(2)} ${cavTopY.toFixed(2)} ${(cavL + cr).toFixed(2)} ${cavTopY.toFixed(2)} ` +
      "Z";
  } else {
    /*
      Default cavity follows the U-bed shape:

          cavL                 cavR
            |-------------------|    cavTopY
            |                   |
             \                 /
              \_____ cx _____/      cavUBot
    */
    const cavBendY = bendY + sideT;
    const cavUHalf = uHalf - sideT * 0.5;
    const cavUBot = uBotY - sideT;

    rimCavityPath =
      `M ${(cavL + cr).toFixed(2)} ${cavTopY.toFixed(2)} ` +
      `L ${(cavR - cr).toFixed(2)} ${cavTopY.toFixed(2)} ` +
      `Q ${cavR.toFixed(2)} ${cavTopY.toFixed(2)} ${cavR.toFixed(2)} ${(cavTopY + cr).toFixed(2)} ` +
      `L ${cavR.toFixed(2)} ${cavBendY.toFixed(2)} ` +
      `C ${cavR.toFixed(2)} ${cavBotY.toFixed(2)} ` +
      `${(cx + cavUHalf).toFixed(2)} ${cavUBot.toFixed(2)} ` +
      `${cx.toFixed(2)} ${cavUBot.toFixed(2)} ` +
      `C ${(cx - cavUHalf).toFixed(2)} ${cavUBot.toFixed(2)} ` +
      `${cavL.toFixed(2)} ${cavBotY.toFixed(2)} ` +
      `${cavL.toFixed(2)} ${cavBendY.toFixed(2)} ` +
      `L ${cavL.toFixed(2)} ${(cavTopY + cr).toFixed(2)} ` +
      `Q ${cavL.toFixed(2)} ${cavTopY.toFixed(2)} ${(cavL + cr).toFixed(2)} ${cavTopY.toFixed(2)} ` +
      "Z";
  }

  const tipY = seatY + params.tipFromSeatMm * s;

  const spokeWireMm = 2.0;
  const spokeW = spokeWireMm * s;
  const spokeX = cx - spokeW / 2;
  const spokeTopY = tipY;
  const spokeBotY = barrelEndY + 14;
  const spokeH = spokeBotY - spokeTopY;
  const spokeThreadBotY = spokeTopY + spokeThreadLengthMm * s;

  const dimSeatX = shankR + 20;
  const dimRimX = shankL - 20;

  const seatMidDy = (seatY - tipY) / 2 + 4;
  const rimMidDy = (tipY - rimOuterY) / 2 + 4;

  return {
    viewW,
    viewH,
    cx,
    scale: s,
    rimPath,
    rimOuterBorderPath,
    rimTopCutoutPath,
    rimTopCutoutBorderPath,
    rimCavityPath,
    nippleHeadPath,
    nippleBodyPath,
    nippleThreadZonePath,
    seatY,
    rimOuterY,
    rimCavityTopY: cavTopY,
    rimCavityBotY: cavBotY,
    barrelEndY,
    tipY,
    hasInnerWallDepth: hasIwd,
    spokeX,
    spokeW,
    spokeTopY,
    spokeBotY,
    spokeH,
    spokeThreadBotY,
    spokeThreadH: spokeThreadBotY - spokeTopY,
    dimSeatX,
    dimRimX,
    seatMidDy,
    rimMidDy,
  };
}
