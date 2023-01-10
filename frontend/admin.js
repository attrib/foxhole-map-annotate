
addListeners(document)

function addListeners(target) {
  const deleteRowButtons = target.getElementsByClassName('deleteRow')
  for (const button of deleteRowButtons) {
    if (button.dataset.clickAdded) {
      continue
    }
    button.dataset.clickAdded = 'true'
    button.addEventListener('click', (event) => {
      event.preventDefault()
      button.parentElement.remove()
    })
  }

  const addRowButtons = target.getElementsByClassName('addRow')
  for (const button of addRowButtons) {
    if (button.dataset.clickAdded) {
      continue
    }
    button.dataset.clickAdded = 'true'
    button.addEventListener('click', (event) => {
      event.preventDefault()
      const templateId = button.dataset.templateId
      const newRow = document.getElementById(templateId).content.cloneNode(true)
      button.parentElement.before(newRow)
      addListeners(button.parentElement.previousElementSibling)
      if (templateId.startsWith('discord-role-add')) {
        changeInputNames(button.parentElement.parentElement.getElementsByClassName('discordId')[0])
      }
    })
  }

  const discordIds = target.getElementsByClassName('discordId')
  for (const discordIdInput of discordIds) {
    if (discordIdInput.dataset.changeadded) {
      continue
    }
    discordIdInput.dataset.changeadded = 'true'
    discordIdInput.addEventListener('change', (event) => {
      changeInputNames(discordIdInput)
    })
  }
}

function changeInputNames(discordIdInput)
{
  const changeNeeded = discordIdInput.parentElement.parentElement.getElementsByClassName('discordIdChange')
  for (const input of changeNeeded) {
    input.name = input.name.replace(/\[discords\]\[\d*\]/, `[discords][${discordIdInput.value}]`)
  }
}