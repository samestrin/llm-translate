/**
 * Save `content` as a file named `name`. The object URL is revoked after the click,
 * not before: a browser may not have started reading the blob yet.
 */
export const downloadText = (content, name, type = 'text/plain') => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
