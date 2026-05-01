declare module '*.xml' {
  const assetId: number
  export default assetId
}

/** Bundled Health chunk: UTF-8 JSON body, shipped as a Metro asset (not a JSON module). */
declare module '*.hkchunk' {
  const assetId: number
  export default assetId
}
