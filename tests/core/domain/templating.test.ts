import { describe, it, expect } from "vitest";
import {
  renderHandlebarsTemplate,
  TemplatingError,
  AVAILABLE_VARIABLES,
} from "@/server/domain/templating";

describe("templating", () => {
  describe("renderHandlebarsTemplate", () => {
    it("renderiza correctamente las variables básicas", () => {
      const templates = {
        subjectTpl: "Hola {{FirstName}}",
        htmlTpl: "<p>Bienvenido, {{FirstName}} {{LastName}} de {{Company}}</p>",
      };
      const variables = {
        FirstName: "Juan",
        LastName: "Pérez",
        Company: "Acme Inc",
      };

      const result = renderHandlebarsTemplate(templates, variables);

      expect(result.subject).toBe("Hola Juan");
      expect(result.html).toBe("<p>Bienvenido, Juan Pérez de Acme Inc</p>");
    });

    it("maneja variables null/undefined correctamente", () => {
      const templates = {
        subjectTpl: "Hola {{FirstName}}",
        htmlTpl: "<p>Empresa: {{Company}}</p>",
      };
      const variables = {
        FirstName: null,
        Company: undefined,
      };

      const result = renderHandlebarsTemplate(templates, variables);

      expect(result.subject).toBe("Hola ");
      expect(result.html).toBe("<p>Empresa: </p>");
    });

    it("renderiza UnsubscribeUrl correctamente", () => {
      const templates = {
        subjectTpl: "Newsletter",
        htmlTpl: '<a href="{{UnsubscribeUrl}}">Darse de baja</a>',
      };
      const variables = {
        UnsubscribeUrl: "https://example.com/u/abc123",
      };

      const result = renderHandlebarsTemplate(templates, variables);

      expect(result.html).toBe('<a href="https://example.com/u/abc123">Darse de baja</a>');
    });

    it("soporta condicionales de Handlebars", () => {
      const templates = {
        subjectTpl: "{{#if FirstName}}Hola {{FirstName}}{{else}}Hola{{/if}}",
        htmlTpl: "<p>{{#if Company}}Empresa: {{Company}}{{else}}Sin empresa{{/if}}</p>",
      };

      // Con FirstName y Company
      const result1 = renderHandlebarsTemplate(templates, {
        FirstName: "María",
        Company: "TechCorp",
      });
      expect(result1.subject).toBe("Hola María");
      expect(result1.html).toBe("<p>Empresa: TechCorp</p>");

      // Sin FirstName ni Company
      const result2 = renderHandlebarsTemplate(templates, {});
      expect(result2.subject).toBe("Hola");
      expect(result2.html).toBe("<p>Sin empresa</p>");
    });

    it("preserva HTML complejo en el template", () => {
      const templates = {
        subjectTpl: "Invitación a evento",
        htmlTpl: `
          <div style="font-family: Arial;">
            <h1>Hola {{FirstName}}</h1>
            <p>Te invitamos al evento de <strong>{{Company}}</strong></p>
            <a href="{{UnsubscribeUrl}}" style="color: gray;">Darse de baja</a>
          </div>
        `,
      };
      const variables = {
        FirstName: "Carlos",
        Company: "FAROandes",
        UnsubscribeUrl: "https://app.com/u/token",
      };

      const result = renderHandlebarsTemplate(templates, variables);

      expect(result.html).toContain("<h1>Hola Carlos</h1>");
      expect(result.html).toContain("<strong>FAROandes</strong>");
      expect(result.html).toContain('href="https://app.com/u/token"');
    });

    it("lanza TemplatingError con field='subject' para errores en el asunto", () => {
      const templates = {
        subjectTpl: "{{#if}}Mal cerrado", // Sintaxis inválida
        htmlTpl: "<p>HTML válido</p>",
      };

      expect(() => renderHandlebarsTemplate(templates, {})).toThrow(TemplatingError);

      try {
        renderHandlebarsTemplate(templates, {});
      } catch (err) {
        expect(err).toBeInstanceOf(TemplatingError);
        if (err instanceof TemplatingError) {
          expect(err.field).toBe("subject");
          expect(err.message).toContain("asunto");
        }
      }
    });

    it("lanza TemplatingError con field='html' para errores en el HTML", () => {
      const templates = {
        subjectTpl: "Asunto válido",
        htmlTpl: "<p>{{#each}}Sin iterador</p>", // Sintaxis inválida
      };

      expect(() => renderHandlebarsTemplate(templates, {})).toThrow(TemplatingError);

      try {
        renderHandlebarsTemplate(templates, {});
      } catch (err) {
        expect(err).toBeInstanceOf(TemplatingError);
        if (err instanceof TemplatingError) {
          expect(err.field).toBe("html");
          expect(err.message).toContain("HTML");
        }
      }
    });

    it("escapa HTML en variables por defecto (seguridad XSS)", () => {
      const templates = {
        subjectTpl: "Mensaje de {{FirstName}}",
        htmlTpl: "<p>{{FirstName}}</p>",
      };
      const variables = {
        FirstName: "<script>alert('xss')</script>",
      };

      const result = renderHandlebarsTemplate(templates, variables);

      // Handlebars escapa HTML por defecto
      expect(result.html).not.toContain("<script>");
      expect(result.html).toContain("&lt;script&gt;");
    });

    it("permite HTML crudo con triple llaves si es necesario", () => {
      const templates = {
        subjectTpl: "Test",
        htmlTpl: "<div>{{{Company}}}</div>",
      };
      const variables = {
        Company: "<strong>Empresa</strong>",
      };

      const result = renderHandlebarsTemplate(templates, variables);

      expect(result.html).toContain("<strong>Empresa</strong>");
    });
  });

  describe("AVAILABLE_VARIABLES", () => {
    it("contiene las variables esperadas", () => {
      const variableNames = AVAILABLE_VARIABLES.map((v) => v.name);

      expect(variableNames).toContain("FirstName");
      expect(variableNames).toContain("LastName");
      expect(variableNames).toContain("Company");
      expect(variableNames).toContain("UnsubscribeUrl");
    });

    it("cada variable tiene descripción y ejemplo", () => {
      for (const variable of AVAILABLE_VARIABLES) {
        expect(variable.description).toBeTruthy();
        expect(variable.example).toContain("{{");
        expect(variable.example).toContain("}}");
      }
    });
  });
});
