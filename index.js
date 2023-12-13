const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;
const chromium = require('chrome-aws-lambda');
app.use(express.static('public'))

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/api/:palavraPesquisada", async (req, res) => {
  const palavraPesquisada = req.params.palavraPesquisada;

  try {
    let browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    // Aumentando o timeout para 60 segundos
    await page.goto("https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_classe_basica.jsp");

    // Clique no elemento <font class="marcador">
    await page.click("font.marcador a");

    // Redirecione diretamente para Pesquisa_classe_avancada.jsp
    await page.goto(
      "https://busca.inpi.gov.br/pePI/jsp/marcas/Pesquisa_classe_avancada.jsp"
    );

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
    await page.screenshot({ path: "Resultado.jpeg" })

    // Use evaluate para extrair o número de resultados encontrados
    const numeroResultados = await page.evaluate(() => {
      const tdElement = document.querySelector('td[colspan="8"]');
      return tdElement ? tdElement.innerText.trim() : null;
    });

    if (numeroResultados === null) {
      res.json({ resultado: "Ótimo! Está disponível para ser a sua marca!" });
    } else {
      console.log("Número de resultados encontrados:", numeroResultados);
      //return path to image
      const pathImage = path.join(__dirname, 'Resultado.jpeg')
      res.json({ pathImage });
    }
  } catch (error) {
    console.error("Erro durante a navegação:", JSON.stringify(error));
    res.status(500).json({ error: `Erro durante a navegação: ${SON.stringify(error)}` });
  } finally {
    // Fechando o navegador
    await browser.close();
  }
});

app.listen(port, () => {
  console.log(`API Listening at port ${port}`);
});
