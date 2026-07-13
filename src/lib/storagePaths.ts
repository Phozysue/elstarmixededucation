export const extractStoragePath = (value: string, bucket: string) => {
  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
    `/${bucket}/`,
  ];

  for (const marker of markers) {
    const index = value.indexOf(marker);
    if (index !== -1) {
      return decodeURIComponent(value.substring(index + marker.length).split("?")[0]);
    }
  }

  return value.split("?")[0];
};