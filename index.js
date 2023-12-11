const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

app.get('/api/:palavraPesquisada', async (req, res) => {
  const palavraPesquisada = req.params.palavraPesquisada;

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  const page = await browser.newPage();

  try {
    // Aumentando o timeout para 60 segundos
    await page.goto('https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_classe_basica.jsp', { timeout: 60000 });

    // Clique no elemento <font class="marcador">
    await page.click('font.marcador a');

    // Encontre o elemento usando XPath que corresponde ao link "Ajuda?"
    const ajudaLink = await page.waitForXPath('//tr[@align="right"]/td/font/a[text()="Ajuda?"]');
    
    // Verifique se o link foi encontrado e clique nele
    if (ajudaLink) {
      await Promise.all([
        page.waitForNavigation(), // Aguarde a navegação
        ajudaLink.click(), // Clique no link
      ]);
    } else {
      console.log('Link "Ajuda?" não encontrado');
    }

    // Redirecione diretamente para Pesquisa_classe_avancada.jsp
    await page.goto('https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_classe_avancada.jsp');

    // Inserindo a palavraPesquisada na caixa de texto
    await page.waitForSelector('input[name="marca"]');
    await page.type('input[name="marca"]', palavraPesquisada);

    // Clique no botão de pesquisa e aguarde a navegação
    await Promise.all([
      page.waitForNavigation(), // Aguarde a navegação
      page.click('input[type="submit"][name="botao"]'), // Clique no botão
    ]);
    // Aguarde um pouco para garantir que a página tenha carregado completamente após a navegação
    await page.waitForTimeout(5000); // Aumentando o tempo de espera

    // salvamento em PDF
    await page.pdf({ path: 'Resultado.pdf' });

    // Use evaluate para extrair o número de resultados encontrados
    const numeroResultados = await page.evaluate(() => {
      const tdElement = document.querySelector('td[colspan="8"]');
      return tdElement ? tdElement.innerText.trim() : null;
    });

    if (numeroResultados === null) {
      console.log('Ótimo! Está disponível para ser a sua marca!');
    } else {
      console.log('Número de resultados encontrados:', numeroResultados);
    }

    res.json({ resultado: 'Ótimo! Está disponível para ser a sua marca!' });
  } catch (error) {
    console.error('Erro durante a navegação:', error);
    res.status(500).json({ error: 'Erro durante a navegação' });
  } finally {
    // Fechando o navegador
    await browser.close();
  }
});

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
