export function isEditingTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  if (
    target.closest(
      'textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"], .ant-select',
    )
  )
    return true;
  const input = target.closest('input');
  return (
    !!input &&
    !['radio', 'checkbox', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(
      input.type,
    )
  );
}
