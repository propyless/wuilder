export interface NippleFit {
  calculatedSpokeLengthMm: number;
  orderedSpokeLengthMm: number;
  nippleBodyLengthMm: number;
  internalThreadLengthMm: number;
  spokeThreadLengthMm: number;
  wellDepthMm: number;
  threadEngagementMm: number;
  tipFromSeatMm: number;
  tipToRimOuterMm: number;
}

export function computeNippleFit(params: {
  calculatedSpokeLengthMm: number;
  orderedSpokeLengthMm: number;
  nippleBodyLengthMm: number;
  internalThreadLengthMm: number;
  spokeThreadLengthMm: number;
  wellDepthMm: number;
}): NippleFit {
  const tipFromSeat =
    params.calculatedSpokeLengthMm - params.orderedSpokeLengthMm;
  const tipToRimOuter = params.wellDepthMm + tipFromSeat;
  const engagement = Math.max(
    0,
    Math.min(
      tipFromSeat + params.spokeThreadLengthMm,
      params.internalThreadLengthMm,
    ) - Math.max(tipFromSeat, 0),
  );
  return {
    calculatedSpokeLengthMm: params.calculatedSpokeLengthMm,
    orderedSpokeLengthMm: params.orderedSpokeLengthMm,
    nippleBodyLengthMm: params.nippleBodyLengthMm,
    internalThreadLengthMm: params.internalThreadLengthMm,
    spokeThreadLengthMm: params.spokeThreadLengthMm,
    wellDepthMm: params.wellDepthMm,
    threadEngagementMm: engagement,
    tipFromSeatMm: tipFromSeat,
    tipToRimOuterMm: tipToRimOuter,
  };
}
